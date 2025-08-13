'use client';

import React, { useCallback } from 'react';
import { FaSearch, FaFilter } from 'react-icons/fa';
import { FilterOptions } from '../../../types/dashboard.types';
import { debounce } from '../../../utils/helpers';
import styles from './AttendeeFilters.module.css';

interface AttendeeFiltersProps {
  searchTerm: string;
  filterStatus: FilterOptions['filterStatus'];
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filterStatus: FilterOptions['filterStatus']) => void;
}

const AttendeeFilters: React.FC<AttendeeFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearch,
  onFilterChange
}) => {
  // Debounced search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((value: string) => onSearch(value), 300),
    [onSearch]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange(e.target.value as FilterOptions['filterStatus']);
  }, [onFilterChange]);

  return (
    <div className={styles.filtersContainer}>
      {/* Search Box */}
      <div className={styles.searchBox}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          defaultValue={searchTerm}
          onChange={handleSearchChange}
          className={styles.searchInput}
          autoComplete="off"
        />
      </div>

      {/* Filter Dropdown */}
      <div className={styles.filterBox}>
        <FaFilter className={styles.filterIcon} />
        <select
          value={filterStatus}
          onChange={handleFilterChange}
          className={styles.filterSelect}
        >
          <option value="all">All Attendees</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked-in">Checked In</option>
          <option value="not-checked-in">Not Checked In</option>
        </select>
      </div>

      {/* Active Filters Indicator */}
      {(searchTerm || filterStatus !== 'all') && (
        <div className={styles.activeFilters}>
          <span className={styles.activeFiltersLabel}>Active filters:</span>
          {searchTerm && (
            <span className={styles.filterTag}>
              Search: "{searchTerm}"
            </span>
          )}
          {filterStatus !== 'all' && (
            <span className={styles.filterTag}>
              Status: {filterStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendeeFilters; 