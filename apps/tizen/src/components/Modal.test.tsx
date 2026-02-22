import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

// Mock spatial navigation
const mockFocusSelf = vi.fn();
vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: () => ({
    ref: { current: null },
    focusKey: 'modal-focus-key',
    focusSelf: mockFocusSelf,
    focused: false,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Modal', () => {
  it('renders children content', () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal title="Test Title" onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('does not render title element when title is omitted', () => {
    const { container } = render(
      <Modal onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    );
    expect(container.querySelector('.modal-title')).toBeNull();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.click(container.querySelector('.modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal container is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.click(container.querySelector('.modal-container')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Tizen Back key (keyCode 10009)', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { keyCode: 10009 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on GoBack key', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'GoBack' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls focusSelf on mount for focus trap', () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    );
    expect(mockFocusSelf).toHaveBeenCalled();
  });
});
