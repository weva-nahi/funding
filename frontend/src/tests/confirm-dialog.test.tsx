import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '@/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Test"
        message="Test message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete this?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Delete this?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked (no typed confirmation required)', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables confirm button until typed confirmation matches', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete user"
        message="Type to confirm"
        requireTypedConfirmation="user@example.com"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'wrong-value' } })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(input, { target: { value: 'user@example.com' } })
    expect(confirmButton).not.toBeDisabled()
  })

  it('clears typed input when dialog reopens', () => {
    const { rerender } = render(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Type to confirm"
        requireTypedConfirmation="DELETE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'DELETE' } })
    expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled()

    rerender(
      <ConfirmDialog
        open={false}
        title="Delete"
        message="Type to confirm"
        requireTypedConfirmation="DELETE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    rerender(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Type to confirm"
        requireTypedConfirmation="DELETE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled()
  })
})