import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState, { NetworkErrorState, PermissionDeniedState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default title and description', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText(/please try again in a moment/i)).toBeDefined();
  });

  it('renders custom title and description', () => {
    render(<ErrorState title="Failed" description="Bad network" />);
    expect(screen.getByText('Failed')).toBeDefined();
    expect(screen.getByText('Bad network')).toBeDefined();
  });

  it('fires onRetry when the Try Again button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('fires secondaryAction.onClick when that button is clicked', () => {
    const onClick = vi.fn();
    render(<ErrorState secondaryAction={{ label: 'Contact Support', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: /contact support/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('surfaces an Error instance message in technical details', () => {
    render(<ErrorState error={new Error('boom')} />);
    expect(screen.getByText(/technical details/i)).toBeDefined();
    expect(screen.getByText('boom')).toBeDefined();
  });

  it('accepts a string error and renders it', () => {
    render(<ErrorState error="kaboom" />);
    expect(screen.getByText('kaboom')).toBeDefined();
  });

  it('exposes role="alert" for assistive tech', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('renders compact layout without crashing', () => {
    const onRetry = vi.fn();
    render(<ErrorState compact onRetry={onRetry} error="x" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });
});

describe('NetworkErrorState', () => {
  it('renders with connection-problem copy', () => {
    render(<NetworkErrorState />);
    expect(screen.getByText(/connection problem/i)).toBeDefined();
  });
});

describe('PermissionDeniedState', () => {
  it('renders with no-access copy', () => {
    render(<PermissionDeniedState />);
    expect(screen.getByText(/don't have access/i)).toBeDefined();
  });
});
