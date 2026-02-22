import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatingsBar } from './RatingsBar';
import type { RatingEntry } from '../services/ratings';

describe('RatingsBar', () => {
  it('renders nothing when ratings array is empty', () => {
    const { container } = render(<RatingsBar ratings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a pill for each rating entry', () => {
    const ratings: RatingEntry[] = [
      { source: 'imdb', label: 'IMDb', score: 85, displayValue: '8.5' },
      { source: 'tomatoes', label: 'RT Critics', score: 90, displayValue: '90%' },
      { source: 'letterboxd', label: 'Letterboxd', score: 40, displayValue: '4.0' },
    ];
    render(<RatingsBar ratings={ratings} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('displays label and displayValue for each rating', () => {
    const ratings: RatingEntry[] = [
      { source: 'imdb', label: 'IMDb', score: 72, displayValue: '7.2' },
      { source: 'metacritic', label: 'Metacritic', score: 65, displayValue: '65' },
    ];
    render(<RatingsBar ratings={ratings} />);

    expect(screen.getByText('IMDb')).toBeInTheDocument();
    expect(screen.getByText('7.2')).toBeInTheDocument();
    expect(screen.getByText('Metacritic')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
  });

  it('applies source-specific CSS class for imdb', () => {
    const ratings: RatingEntry[] = [
      { source: 'imdb', label: 'IMDb', score: 80, displayValue: '8.0' },
    ];
    render(<RatingsBar ratings={ratings} />);

    const pill = screen.getByRole('listitem');
    expect(pill.className).toContain('imdb');
  });

  it('applies rt CSS class for tomatoes and audience sources', () => {
    const ratings: RatingEntry[] = [
      { source: 'tomatoes', label: 'RT Critics', score: 88, displayValue: '88%' },
      { source: 'audience', label: 'RT Audience', score: 75, displayValue: '75%' },
    ];
    render(<RatingsBar ratings={ratings} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0].className).toContain('rt');
    expect(items[1].className).toContain('rt');
  });

  it('applies mdb fallback class for unknown sources', () => {
    const ratings: RatingEntry[] = [
      { source: 'letterboxd', label: 'Letterboxd', score: 40, displayValue: '4.0' },
    ];
    render(<RatingsBar ratings={ratings} />);

    const pill = screen.getByRole('listitem');
    expect(pill.className).toContain('mdb');
  });

  it('has accessible list role and label', () => {
    const ratings: RatingEntry[] = [
      { source: 'tmdb', label: 'TMDB', score: 70, displayValue: '7.0' },
    ];
    render(<RatingsBar ratings={ratings} />);

    expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Ratings');
  });
});
