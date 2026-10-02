"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ChevronDown, Eye, EyeOff, ImagePlus, Pencil, Pin, Plus, Trash, X } from "lucide-react";
import { toast } from "sonner";
import { deleteJourneyPostAction, saveJourneyPostAction, uploadJourneyImageAction } from "@/actions/admin";
import { JOURNEY_KIND_META, JourneyCard } from "@/components/journey/JourneyCard";
import { formatDateShort } from "@/lib/booking/time";
import { JOURNEY_KINDS, type JourneyKind, type JourneyPost } from "@/lib/booking/types";
import { prepareImageForUpload } from "@/lib/data/journey-images";
import type { JourneyPostForm } from "@/lib/validation/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils/cn";
import { ConfirmDialog } from "./ConfirmDialog";

type Editing = { post: JourneyPost | null } | null;

export function JourneyManager({ posts, today }: { posts: JourneyPost[]; today: string }) {
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setEditing({ post: null })} icon={<Plus aria-hidden className="size-4" />}>
          New post
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ImagePlus}
          title="Share your first moment"
          description="Post a tournament win, a milestone or a photo from training. It appears on the homepage right away."
          action={
            <Button variant="secondary" onClick={() => setEditing({ post: null })}>
              New post
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const meta = JOURNEY_KIND_META[post.kind];
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ post })}
                  className={cn(
                    "group flex w-full gap-4 rounded-card border border-line bg-white p-3 text-left shadow-soft transition-[box-shadow,border-color] hover:border-ink/20 hover:shadow-lift",
                    !post.isPublished && "opacity-70",
                  )}
                >
                  <span className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-surface">
                    <Image src={post.imageUrl} alt="" fill sizes="96px" className="object-cover" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col py-1">
                    <span className="flex flex-wrap gap-1.5">
                      <Badge tone={post.kind === "achievement" ? "lime" : "neutral"}>{meta.label}</Badge>
                      {post.isFeatured && (
                        <Badge tone="navy">
                          <Pin aria-hidden className="size-3" /> Pinned
                        </Badge>
                      )}
                      {!post.isPublished && (
                        <Badge tone="warning">
                          <EyeOff aria-hidden className="size-3" /> Hidden
                        </Badge>
                      )}
                    </span>
                    <span className="mt-2 line-clamp-2 font-semibold leading-snug">{post.title}</span>
                    {(post.result || post.playerName) && (
                      <span className="mt-0.5 truncate text-sm text-muted">{[post.result, post.playerName].filter(Boolean).join(" · ")}</span>
                    )}
                    <span className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
                      {formatDateShort(post.happenedOn)}
                      <Pencil aria-hidden className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <JourneyEditor editing={editing} today={today} onClose={() => setEditing(null)} />
    </>
  );
}

// ---------------------------------------------------------------------------

function toForm(post: JourneyPost | null, today: string): JourneyPostForm {
  return {
    id: post?.id,
    kind: post?.kind ?? "achievement",
    title: post?.title ?? "",
    body: post?.body ?? "",
    imageUrl: post?.imageUrl ?? "",
    imageAlt: post?.imageAlt ?? "",
    playerName: post?.playerName ?? "",
    eventName: post?.eventName ?? "",
    result: post?.result ?? "",
    happenedOn: post?.happenedOn ?? today,
    isPublished: post?.isPublished ?? true,
    isFeatured: post?.isFeatured ?? false,
    titleFr: post?.titleFr ?? "",
    bodyFr: post?.bodyFr ?? "",
    resultFr: post?.resultFr ?? "",
  };
}

function JourneyEditor({ editing, today, onClose }: { editing: Editing; today: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = editing !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => open && onClose()}
      className="m-0 h-dvh max-h-dvh w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/60 backdrop:backdrop-blur-sm sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-4xl sm:rounded-card sm:shadow-lift"
    >
      {editing && <EditorBody key={editing.post?.id ?? "new"} post={editing.post} today={today} titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function EditorBody({ post, today, titleId, onClose }: { post: JourneyPost | null; today: string; titleId: string; onClose: () => void }) {
  const [form, setForm] = useState<JourneyPostForm>(() => toForm(post, today));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof JourneyPostForm>(key: K, value: JourneyPostForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file);
      const data = new FormData();
      data.set("file", prepared);
      const res = await uploadJourneyImageAction(data);
      if (res.ok) {
        set("imageUrl", res.url);
        toast.success("Photo uploaded.");
      } else toast.error(res.error);
    } catch {
      toast.error("This image could not be read. Try a JPG or PNG.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveJourneyPostAction({ ...form, imageAlt: form.imageAlt || form.title });
      if (res.ok) {
        toast.success(form.isPublished ? "Published — it's live on the homepage." : "Saved as hidden.");
        onClose();
      } else {
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));
        toast.error(res.error);
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!post) return;
      const res = await deleteJourneyPostAction(post.id);
      setConfirmDelete(false);
      if (res.ok) {
        toast.success("Post deleted.");
        onClose();
      } else toast.error(res.error);
    });

  const isAchievement = form.kind === "achievement";
  const preview = {
    kind: form.kind as JourneyKind,
    title: form.title || "Your title",
    body: form.body || null,
    imageUrl: form.imageUrl,
    imageAlt: form.imageAlt,
    playerName: isAchievement ? form.playerName || null : null,
    eventName: isAchievement ? form.eventName || null : null,
    result: isAchievement ? form.result || null : null,
    happenedOn: form.happenedOn || today,
  };

  return (
    <div className="flex h-full max-h-[inherit] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {post ? "Edit post" : "New post"}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface">
          <X aria-hidden className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-8 px-5 py-5 sm:px-6 md:grid-cols-[1fr_300px]">
          <form
            id="journey-form"
            noValidate
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {/* Type */}
            <div role="radiogroup" aria-label="Post type" className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
              {JOURNEY_KINDS.map((k) => {
                const meta = JOURNEY_KIND_META[k];
                const Icon = meta.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === k}
                    onClick={() => set("kind", k)}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
                      form.kind === k ? "bg-ink text-white shadow-soft" : "text-muted hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-4" /> {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Photo */}
            <div>
              <p className="mb-2 text-sm font-semibold">
                Photo<span className="ml-0.5 text-danger" aria-hidden>*</span>
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  upload(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-colors",
                  dragOver ? "border-ink bg-lime/10" : errors.imageUrl ? "border-danger" : "border-line",
                )}
              >
                <span className="relative flex aspect-[4/5] w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-muted">
                  {form.imageUrl ? <Image src={form.imageUrl} alt="" fill sizes="80px" className="object-cover" /> : <ImagePlus aria-hidden className="size-6" />}
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <Spinner label="Uploading" />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {form.imageUrl ? "Replace photo" : "Upload photo"}
                  </Button>
                  <p className="mt-2 text-xs text-muted">JPG, PNG or WebP — or drop it here. Portrait photos look best.</p>
                  {errors.imageUrl && <p className="mt-1 text-sm text-danger">{errors.imageUrl}</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => upload(e.target.files?.[0])} />
              </div>
            </div>

            <Field id="jp-title" label="Title" required error={errors.title} hint={isAchievement ? "e.g. “Club champion!” or “First tournament win”" : undefined}>
              <Input id="jp-title" value={form.title} maxLength={140} onChange={(e) => set("title", e.target.value)} invalid={!!errors.title} />
            </Field>

            {isAchievement && (
              <div className="grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-3">
                <Field id="jp-result" label="Result" error={errors.result} hint="Winner, Finalist…">
                  <Input id="jp-result" value={form.result ?? ""} maxLength={120} onChange={(e) => set("result", e.target.value)} />
                </Field>
                <Field id="jp-player" label="Player" error={errors.playerName}>
                  <Input id="jp-player" value={form.playerName ?? ""} maxLength={120} onChange={(e) => set("playerName", e.target.value)} />
                </Field>
                <Field id="jp-event" label="Tournament" error={errors.eventName}>
                  <Input id="jp-event" value={form.eventName ?? ""} maxLength={160} onChange={(e) => set("eventName", e.target.value)} />
                </Field>
              </div>
            )}

            <Field id="jp-body" label="Story" error={errors.body}>
              <Textarea id="jp-body" rows={3} className="min-h-24" value={form.body ?? ""} maxLength={1500} onChange={(e) => set("body", e.target.value)} />
            </Field>

            <details className="group rounded-2xl border border-line" open={!!form.titleFr}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
                <span>
                  Version française <span className="font-normal text-muted">— empty = English text</span>
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
                <Field id="jp-title-fr" label="Titre (FR)">
                  <Input id="jp-title-fr" lang="fr" value={form.titleFr ?? ""} maxLength={140} onChange={(e) => set("titleFr", e.target.value)} />
                </Field>
                {isAchievement && (
                  <Field id="jp-result-fr" label="Résultat (FR)" hint="Vainqueur, Finaliste…">
                    <Input id="jp-result-fr" lang="fr" value={form.resultFr ?? ""} maxLength={120} onChange={(e) => set("resultFr", e.target.value)} />
                  </Field>
                )}
                <Field id="jp-body-fr" label="Histoire (FR)" className="sm:col-span-2">
                  <Textarea id="jp-body-fr" lang="fr" rows={3} className="min-h-24" value={form.bodyFr ?? ""} maxLength={1500} onChange={(e) => set("bodyFr", e.target.value)} />
                </Field>
              </div>
            </details>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="jp-date" label="Date" required error={errors.happenedOn}>
                <Input id="jp-date" type="date" value={form.happenedOn} onChange={(e) => set("happenedOn", e.target.value)} />
              </Field>
              <Field id="jp-alt" label="Photo description" hint="For screen readers & Google. Defaults to the title.">
                <Input id="jp-alt" value={form.imageAlt} maxLength={300} onChange={(e) => set("imageAlt", e.target.value)} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} />
                <Eye aria-hidden className="size-4 text-muted" /> Show on the website
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
                <Pin aria-hidden className="size-4 text-muted" /> Pin first on the homepage
              </label>
            </div>
          </form>

          {/* Live preview */}
          <div className="order-first md:order-none">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Preview</p>
            <div className="mx-auto max-w-[260px] md:sticky md:top-0 md:max-w-none">
              {form.imageUrl ? (
                <JourneyCard post={preview} sizes="300px" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-card bg-surface text-center text-sm text-muted">
                  Upload a photo to
                  <br />
                  see the card
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="safe-bottom flex items-center justify-between gap-3 border-t border-line bg-white px-5 pt-4 sm:px-6 sm:pb-4">
        {post ? (
          <Button variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setConfirmDelete(true)} disabled={pending} icon={<Trash aria-hidden className="size-4" />}>
            Delete
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button type="submit" form="journey-form" variant="secondary" loading={pending} disabled={uploading}>
          {form.isPublished ? (post ? "Save & publish" : "Publish") : "Save hidden"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        description="It disappears from the website immediately. This can't be undone."
        confirmLabel="Delete post"
        tone="danger"
        loading={pending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
