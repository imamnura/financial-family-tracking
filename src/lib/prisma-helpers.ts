import { Prisma } from "@prisma/client";

/**
 * Type-safe Prisma error handler
 */
export class PrismaErrorHandler {
  static handle(error: unknown): { message: string; code?: string } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return {
            message: "Data sudah ada. Silakan gunakan data yang berbeda.",
            code: "DUPLICATE",
          };
        case "P2003":
          return {
            message: "Relasi data tidak valid.",
            code: "FOREIGN_KEY_VIOLATION",
          };
        case "P2025":
          return {
            message: "Data tidak ditemukan.",
            code: "NOT_FOUND",
          };
        case "P2014":
          return {
            message: "Relasi data tidak valid. Data terkait diperlukan.",
            code: "RELATION_VIOLATION",
          };
        default:
          return {
            message: `Error database: ${error.message}`,
            code: error.code,
          };
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        message: "Data tidak valid. Periksa kembali input Anda.",
        code: "VALIDATION_ERROR",
      };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        message: "Gagal terhubung ke database.",
        code: "CONNECTION_ERROR",
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: "UNKNOWN",
      };
    }

    return {
      message: "Terjadi kesalahan yang tidak diketahui.",
      code: "UNKNOWN",
    };
  }
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationParams(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Date range helper untuk filter transaksi
 */
export interface DateRangeFilter {
  from?: Date | string;
  to?: Date | string;
}

export function getDateRangeFilter(range?: DateRangeFilter) {
  if (!range) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};

  if (range.from) {
    filter.gte =
      typeof range.from === "string" ? new Date(range.from) : range.from;
  }

  if (range.to) {
    filter.lte = typeof range.to === "string" ? new Date(range.to) : range.to;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Helper untuk mendapatkan range bulan ini
 */
export function getCurrentMonthRange(): DateRangeFilter {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return { from, to };
}

/**
 * Helper untuk mendapatkan range tahun ini
 */
export function getCurrentYearRange(): DateRangeFilter {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  return { from, to };
}

/**
 * Helper untuk soft delete (jika nanti mau implementasi)
 */
export function excludeDeleted<T extends { deletedAt?: Date | null }>(
  items: T[]
): T[] {
  return items.filter((item) => !item.deletedAt);
}

/**
 * Helper untuk select fields yang aman (exclude password, dll)
 */
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  familyId: true,
  createdAt: true,
  updatedAt: true,
  // password: false (excluded by default)
} as const;

/**
 * Type untuk User tanpa password
 */
export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  avatar: string | null;
  familyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
