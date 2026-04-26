import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageLoading from './PageLoading';

describe('PageLoading', () => {
  it('renders the supplied icon', () => {
    render(
      <PageLoading
        accent="indigo"
        icon={<svg data-testid="page-icon" />}
      />,
    );
    expect(screen.getByTestId('page-icon')).toBeDefined();
  });

  it('renders the optional label when provided', () => {
    render(
      <PageLoading
        accent="purple"
        label="Loading estate admins..."
        icon={<svg />}
      />,
    );
    expect(screen.getByText('Loading estate admins...')).toBeDefined();
  });

  it('omits the label paragraph when none is supplied', () => {
    const { container } = render(
      <PageLoading accent="gray" icon={<svg />} />,
    );
    // Only the sr-only span is present for assistive tech, no visible label paragraph.
    expect(container.querySelector('p')).toBeNull();
  });

  it('exposes role="status" so assistive tech announces the load', () => {
    render(<PageLoading accent="gray" icon={<svg />} />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('applies the chosen accent classes', () => {
    const { container } = render(
      <PageLoading accent="emerald" icon={<svg />} />,
    );
    expect(container.innerHTML).toContain('from-emerald-500');
    expect(container.innerHTML).toContain('border-t-emerald-600');
  });

  it('falls back to indigo when accent is not specified', () => {
    const { container } = render(<PageLoading icon={<svg />} />);
    expect(container.innerHTML).toContain('from-indigo-500');
  });
});
