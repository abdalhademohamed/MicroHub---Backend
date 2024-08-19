export class PaginateResultDto<T> {
    items: T[];
    total: number;
    currentPage: number;
    totalPages: number;
  }