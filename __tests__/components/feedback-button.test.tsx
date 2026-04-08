// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pathnameValue, toastSuccessMock, toastErrorMock, submitFeedbackMock } = vi.hoisted(() => ({
  pathnameValue: '/batches',
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  submitFeedbackMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameValue,
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/app/actions/feedback', () => ({
  submitFeedback: submitFeedbackMock,
}))

import { FeedbackButton } from '@/components/FeedbackButton'

function renderFeedback() {
  return render(<FeedbackButton />)
}

const SUBMIT_BTN = { name: /submit feedback/i }

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /open feedback dialog/i }))
  await screen.findByRole('dialog')
}

function makeFile(name: string, type: string, sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

describe('FeedbackButton', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    submitFeedbackMock.mockReset()
  })

  it('renders a trigger button', () => {
    renderFeedback()
    expect(screen.getByRole('button', { name: /open feedback dialog/i })).toBeInTheDocument()
  })

  it('opens the dialog when the trigger is clicked', async () => {
    renderFeedback()
    await openDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Share Feedback')).toBeInTheDocument()
  })

  it('renders the three category buttons', async () => {
    renderFeedback()
    await openDialog()
    expect(screen.getByRole('button', { name: 'Bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suggestion' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument()
  })

  it('changes the textarea label when a category is selected', async () => {
    renderFeedback()
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Suggestion' }))
    expect(screen.getByLabelText('What would you improve?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(screen.getByLabelText('Tell us more')).toBeInTheDocument()
  })

  it('shows an inline error when submitting an empty form', async () => {
    renderFeedback()
    await openDialog()

    fireEvent.click(screen.getByRole('button', SUBMIT_BTN))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please describe your feedback before submitting.'
      )
    })
    expect(submitFeedbackMock).not.toHaveBeenCalled()
  })

  it('clears the inline error when the user starts typing', async () => {
    renderFeedback()
    await openDialog()

    fireEvent.click(screen.getByRole('button', SUBMIT_BTN))
    await screen.findByRole('alert')

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('submits form data and shows a success toast on successful submit', async () => {
    submitFeedbackMock.mockResolvedValue({ success: true, data: null })
    renderFeedback()
    await openDialog()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'My detailed feedback' },
    })
    fireEvent.click(screen.getByRole('button', SUBMIT_BTN))

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith(
      'Feedback sent! Thanks for your help.'
    ))
    expect(submitFeedbackMock).toHaveBeenCalledTimes(1)
  })

  it('shows an error toast when the server returns an error', async () => {
    submitFeedbackMock.mockResolvedValue({
      success: false,
      error: 'Could not save feedback. Please try again.',
    })
    renderFeedback()
    await openDialog()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Some feedback' },
    })
    fireEvent.click(screen.getByRole('button', SUBMIT_BTN))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      'Could not save feedback. Please try again.'
    ))
    // Dialog stays open on failure
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── File attachment tests ─────────────────────────────────────────

  it('renders the attach file label when no file is selected', async () => {
    renderFeedback()
    await openDialog()
    expect(screen.getByText(/attach screenshot or file/i)).toBeInTheDocument()
  })

  it('shows the filename and a remove button after a valid file is chosen', async () => {
    renderFeedback()
    await openDialog()

    const file = makeFile('screenshot.png', 'image/png')
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('screenshot.png')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove attachment/i })).toBeInTheDocument()
    // Attach label should be hidden
    expect(screen.queryByText(/attach screenshot or file/i)).not.toBeInTheDocument()
  })

  it('rejects a file with an unsupported type and shows an inline error', async () => {
    renderFeedback()
    await openDialog()

    const file = makeFile('data.csv', 'text/csv')
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /only png, jpg, gif, webp, or pdf/i
    )
    expect(screen.queryByText('data.csv')).not.toBeInTheDocument()
  })

  it('rejects a file that exceeds 5 MB and shows an inline error', async () => {
    renderFeedback()
    await openDialog()

    const file = makeFile('large.png', 'image/png', 6 * 1024 * 1024)
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/smaller than 5 mb/i)
  })

  it('clears the attachment when the remove button is clicked', async () => {
    renderFeedback()
    await openDialog()

    const file = makeFile('screenshot.png', 'image/png')
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText('screenshot.png')

    fireEvent.click(screen.getByRole('button', { name: /remove attachment/i }))

    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument()
    expect(screen.getByText(/attach screenshot or file/i)).toBeInTheDocument()
  })

  it('includes the attachment in the form data when submitting with a file', async () => {
    submitFeedbackMock.mockResolvedValue({ success: true, data: null })
    renderFeedback()
    await openDialog()

    const file = makeFile('bug.png', 'image/png')
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Crashes on load' } })
    fireEvent.click(screen.getByRole('button', SUBMIT_BTN))

    await waitFor(() => expect(submitFeedbackMock).toHaveBeenCalledTimes(1))

    const submittedFormData: FormData = submitFeedbackMock.mock.calls[0][0]
    expect(submittedFormData.get('attachment')).toBe(file)
    expect(toastSuccessMock).toHaveBeenCalledWith('Feedback sent! Thanks for your help.')
  })

  it('resets the attachment when the dialog is closed and reopened', async () => {
    renderFeedback()
    await openDialog()

    const file = makeFile('screenshot.png', 'image/png')
    const input = document.querySelector<HTMLInputElement>('#feedback-attachment')!
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText('screenshot.png')

    // Close dialog via the close button
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Re-open
    await openDialog()
    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument()
    expect(screen.getByText(/attach screenshot or file/i)).toBeInTheDocument()
  })
})
