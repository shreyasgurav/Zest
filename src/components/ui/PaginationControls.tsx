/**
 * 📊 PAGINATION CONTROLS FOR LARGE EVENTS
 * 
 * A reusable pagination component optimized for events with 1000+ attendees.
 * Includes page navigation, page size controls, and performance indicators.
 */

import React from 'react';
import { FaChevronLeft, FaChevronRight, FaFastBackward, FaFastForward, FaClock, FaMemory, FaExclamationTriangle } from 'react-icons/fa';
import { PaginationState, PerformanceMetrics, PERFORMANCE_CONFIG } from '@/shared/utils/helpers/performanceOptimizations';
import styles from './PaginationControls.module.css';

interface PaginationControlsProps {
  pagination: PaginationState;
  performance?: PerformanceMetrics;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLargeEvent?: boolean;
  showPerformanceWarning?: boolean;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  performance,
  onPageChange,
  onPageSizeChange,
  isLargeEvent = false,
  showPerformanceWarning = false,
  className = ''
}) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    hasNextPage,
    hasPrevPage,
    loading
  } = pagination;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`${styles.paginationControls} ${className}`}>
      {/* Performance Warning Banner */}
      {showPerformanceWarning && (
        <div className={styles.performanceWarning}>
          <FaExclamationTriangle />
          <span>
            Large event detected ({totalCount}+ attendees). Pagination enabled for optimal performance.
          </span>
        </div>
      )}

      {/* Page Size Selector */}
      <div className={styles.pageSizeSection}>
        <label htmlFor="pageSize">Show:</label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={styles.pageSizeSelect}
          disabled={loading}
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* Main Pagination Controls */}
      <div className={styles.paginationNav}>
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage || loading}
          className={`${styles.pageButton} ${styles.firstLastButton}`}
          title="First page"
        >
          <FaFastBackward />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || loading}
          className={`${styles.pageButton} ${styles.prevNextButton}`}
          title="Previous page"
        >
          <FaChevronLeft />
        </button>

        {/* Page Numbers */}
        <div className={styles.pageNumbers}>
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className={styles.pageDots}>...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  disabled={loading}
                  className={`${styles.pageNumber} ${
                    page === currentPage ? styles.currentPage : ''
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || loading}
          className={`${styles.pageButton} ${styles.prevNextButton}`}
          title="Next page"
        >
          <FaChevronRight />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage || loading}
          className={`${styles.pageButton} ${styles.firstLastButton}`}
          title="Last page"
        >
          <FaFastForward />
        </button>
      </div>

      {/* Page Info */}
      <div className={styles.pageInfo}>
        <span>
          Page {currentPage} of {totalPages} 
          {totalCount > 0 && (
            <span className={styles.totalCount}>
              ({totalCount} total attendees)
            </span>
          )}
        </span>
      </div>

      {/* Performance Metrics (for large events) */}
      {isLargeEvent && performance && (
        <div className={styles.performanceMetrics}>
          <div className={styles.metric}>
            <FaClock />
            <span>{performance.queryTime}ms</span>
          </div>
          <div className={styles.metric}>
            <FaMemory />
            <span>{Math.round(performance.memoryUsage / 1024)}KB</span>
          </div>
          {performance.queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD && (
            <div className={styles.metricWarning}>
              <FaExclamationTriangle />
              <span>Slow query</span>
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <span>Loading attendees...</span>
        </div>
      )}
    </div>
  );
}; 