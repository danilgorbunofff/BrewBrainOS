'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LucideMessageSquare, LucidePaperclip, LucideX } from 'lucide-react'
import { submitFeedback } from '@/app/actions/feedback'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/SubmitButton'

const CATEGORIES = ['Bug', 'Suggestion', 'Other'] as const
type Category = (typeof CATEGORIES)[number]

const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_ATTACHMENT_LABEL = 'PNG, JPG, GIF, WebP or PDF · max 5 MB'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('Bug')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setAttachmentError(null)
    if (!file) { setAttachment(null); return }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError('Only PNG, JPG, GIF, WebP, or PDF files are accepted.')
      e.target.value = ''
      setAttachment(null)
      return
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError('File must be smaller than 5 MB.')
      e.target.value = ''
      setAttachment(null)
      return
    }
    setAttachment(file)
  }

  function clearAttachment() {
    setAttachment(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetForm() {
    formRef.current?.reset()
    setCategory('Bug')
    setInlineError(null)
    setAttachment(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInlineError(null)

    const formData = new FormData(e.currentTarget)
    const message = (formData.get('message') as string | null)?.trim() ?? ''

    if (!message) {
      setInlineError('Please describe your feedback before submitting.')
      return
    }

    formData.set('message', message)
    formData.append('url', pathname)
    formData.append('category', category)
    if (attachment) {
      formData.set('attachment', attachment)
    }

    const res = await submitFeedback(formData)

    if (res.success) {
      toast.success('Feedback sent! Thanks for your help.')
      setOpen(false)
      resetForm()
    } else {
      toast.error(res.error || 'Failed to send feedback.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}>
      <DialogTrigger
        render={
          <Button
            variant="default"
            size="icon"
            aria-label="Open feedback dialog"
            className="feedback-btn fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-2xl"
          />
        }
      >
        <LucideMessageSquare className="h-5 w-5" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight">
            Share Feedback
          </DialogTitle>
          <DialogDescription>
            Found a bug or have a suggestion? Let us know — this helps us improve the platform.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="mt-2 space-y-4" noValidate>
          {/* Category selector */}
          <fieldset>
            <legend className="sr-only">Feedback category</legend>
            <div className="flex gap-2" role="group" aria-label="Feedback category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ' +
                    (category === cat
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground')
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Message textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="feedback-message"
              className="text-sm font-medium text-foreground"
            >
              {category === 'Bug' ? 'What went wrong?' : category === 'Suggestion' ? 'What would you improve?' : 'Tell us more'}
            </label>
            <textarea
              id="feedback-message"
              name="message"
              required
              aria-required="true"
              aria-invalid={!!inlineError}
              aria-describedby={inlineError ? 'feedback-error' : undefined}
              placeholder={
                category === 'Bug'
                  ? 'Describe the issue and what you expected to happen\u2026'
                  : category === 'Suggestion'
                  ? "Describe your idea or what you'd change\u2026"
                  : 'Anything on your mind\u2026'
              }
              onChange={() => inlineError && setInlineError(null)}
              className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[110px] resize-none"
            />
            {inlineError && (
              <p id="feedback-error" role="alert" className="text-xs text-destructive">
                {inlineError}
              </p>
            )}
          </div>

          {/* File attachment */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Attachment <span className="text-muted-foreground/60">(optional · {ALLOWED_ATTACHMENT_LABEL})</span>
            </p>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              id="feedback-attachment"
              type="file"
              name="attachment"
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf"
              aria-label="Attach a screenshot or file"
              onChange={handleFileChange}
              className="sr-only"
            />

            {attachment ? (
              /* File selected: show filename + clear button */
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <LucidePaperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-xs text-foreground" title={attachment.name}>
                  {attachment.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(attachment.size)}
                </span>
                <button
                  type="button"
                  onClick={clearAttachment}
                  aria-label="Remove attachment"
                  className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LucideX className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* No file: show pick button */
              <label
                htmlFor="feedback-attachment"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <LucidePaperclip className="h-3.5 w-3.5" />
                Attach screenshot or file
              </label>
            )}

            {attachmentError && (
              <p role="alert" className="text-xs text-destructive">
                {attachmentError}
              </p>
            )}
          </div>

          <SubmitButton
            className="w-full"
            pendingText="Sending\u2026"
            ariaLabel="Submit feedback"
          >
            Send Feedback
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}

