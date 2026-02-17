/// <reference path="../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    hasNextPage: true,
    hasPreviousPage: false,
    totalCount: 100,
    pageSize: 10,
    onPageChange: jest.fn(),
    onNextPage: jest.fn(),
    onPreviousPage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display Information', () => {
    it('shows correct item range for first page', () => {
      render(<Pagination {...defaultProps} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
    });

    it('shows correct item range for middle page', () => {
      render(<Pagination {...defaultProps} currentPage={5} hasPreviousPage={true} />);

      expect(screen.getByText('41')).toBeInTheDocument(); // (5-1)*10 + 1
      expect(screen.getByText('50')).toBeInTheDocument(); // 5*10
    });

    it('shows correct item range for last page with partial results', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={10}
          totalCount={95}
          hasNextPage={false}
          hasPreviousPage={true}
        />
      );

      expect(screen.getByText('91')).toBeInTheDocument(); // (10-1)*10 + 1
      expect(screen.getByText('95')).toBeInTheDocument(); // min(10*10, 95)
    });

    it('shows "resultados" text in Spanish', () => {
      render(<Pagination {...defaultProps} />);

      expect(screen.getByText(/resultados/)).toBeInTheDocument();
    });
  });

  describe('Previous Button', () => {
    it('disables previous button on first page', () => {
      render(<Pagination {...defaultProps} hasPreviousPage={false} />);

      expect(screen.getByText('Anterior').closest('button')).toBeDisabled();
    });

    it('enables previous button when not on first page', () => {
      render(
        <Pagination {...defaultProps} currentPage={2} hasPreviousPage={true} />
      );

      expect(screen.getByText('Anterior').closest('button')).not.toBeDisabled();
    });

    it('calls onPreviousPage when clicked', () => {
      const onPreviousPage = jest.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={2}
          hasPreviousPage={true}
          onPreviousPage={onPreviousPage}
        />
      );

      fireEvent.click(screen.getByText('Anterior'));

      expect(onPreviousPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Next Button', () => {
    it('enables next button when not on last page', () => {
      render(<Pagination {...defaultProps} hasNextPage={true} />);

      expect(screen.getByText('Siguiente').closest('button')).not.toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={10}
          hasNextPage={false}
          hasPreviousPage={true}
        />
      );

      expect(screen.getByText('Siguiente').closest('button')).toBeDisabled();
    });

    it('calls onNextPage when clicked', () => {
      const onNextPage = jest.fn();
      render(<Pagination {...defaultProps} onNextPage={onNextPage} />);

      fireEvent.click(screen.getByText('Siguiente'));

      expect(onNextPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Page Numbers', () => {
    it('shows all pages when totalPages <= 5', () => {
      render(<Pagination {...defaultProps} totalPages={5} totalCount={50} />);

      // Should show pages 1-5
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
    });

    it('calls onPageChange when page number is clicked', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination {...defaultProps} totalPages={5} onPageChange={onPageChange} />
      );

      fireEvent.click(screen.getByRole('button', { name: '3' }));

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('highlights current page', () => {
      render(<Pagination {...defaultProps} currentPage={3} totalPages={5} hasPreviousPage={true} />);

      const currentPageButton = screen.getByRole('button', { name: '3' });
      // Current page should have 'default' variant (not 'outline')
      expect(currentPageButton).not.toHaveClass('border');
    });

    it('shows ellipsis for many pages when on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} totalPages={20} />);

      // Should show 1, 2, 3, ..., 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getAllByText('...')).toHaveLength(1);
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    });

    it('shows ellipsis on both sides when on middle page', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={10}
          totalPages={20}
          hasPreviousPage={true}
        />
      );

      // Should show 1, ..., 8, 9, 10, 11, 12, ..., 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getAllByText('...')).toHaveLength(2);
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    });

    it('shows ellipsis only before when on last pages', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={20}
          totalPages={20}
          hasNextPage={false}
          hasPreviousPage={true}
        />
      );

      // Should show 1, ..., 18, 19, 20
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getAllByText('...')).toHaveLength(1);
      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single page correctly', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          totalPages={1}
          totalCount={5}
          hasNextPage={false}
          hasPreviousPage={false}
        />
      );

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByText('Anterior').closest('button')).toBeDisabled();
      expect(screen.getByText('Siguiente').closest('button')).toBeDisabled();
    });

    it('handles two pages correctly', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          totalPages={2}
          totalCount={15}
          hasNextPage={true}
        />
      );

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('calculates correct endItem when last page is partial', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={3}
          totalPages={3}
          totalCount={25}
          pageSize={10}
          hasNextPage={false}
          hasPreviousPage={true}
        />
      );

      // Last page should show items 21-25 (not 21-30)
      expect(screen.getByText('21')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('handles empty results', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          totalPages={0}
          totalCount={0}
          hasNextPage={false}
          hasPreviousPage={false}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Interaction Flow', () => {
    it('allows navigation through pages', () => {
      const onPageChange = jest.fn();
      const onNextPage = jest.fn();
      const onPreviousPage = jest.fn();

      const { rerender } = render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          onPageChange={onPageChange}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}
        />
      );

      // Click next
      fireEvent.click(screen.getByText('Siguiente'));
      expect(onNextPage).toHaveBeenCalled();

      // Simulate page change
      rerender(
        <Pagination
          {...defaultProps}
          currentPage={2}
          hasPreviousPage={true}
          onPageChange={onPageChange}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}
        />
      );

      // Click previous
      fireEvent.click(screen.getByText('Anterior'));
      expect(onPreviousPage).toHaveBeenCalled();

      // Click specific page
      fireEvent.click(screen.getByRole('button', { name: '5' }));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe('Different Page Sizes', () => {
    it('calculates range correctly for pageSize of 25', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={2}
          pageSize={25}
          totalCount={100}
          hasPreviousPage={true}
        />
      );

      expect(screen.getByText('26')).toBeInTheDocument(); // (2-1)*25 + 1
      expect(screen.getByText('50')).toBeInTheDocument(); // 2*25
    });

    it('calculates range correctly for pageSize of 50', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={1}
          pageSize={50}
          totalCount={150}
          totalPages={3}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });
});
