import { Injectable } from "@nestjs/common";
import { CreateAuditLogDto } from "./dto/create.audit.log.dto";
import { UpdateAuditLogDto } from "./dto/update.audit.log.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditLogEntity } from "./entities/audit.log.entity";
import { Repository } from "typeorm";
import { GetAuditLogsDto } from "./dto/get.audit.log.dto";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async getAuditLogs(queryParams: GetAuditLogsDto) {
    const {
      username,
      email,
      day,
      tableName,
      sortBy = "timestamp",
      sortOrder = "DESC",
      page = 1,
      limit = 10,
    } = queryParams;

    this.validateSortParams(sortBy, sortOrder);
    this.validateInputs(username, email, day);

    try {
      let sql = `
        SELECT *
        FROM "audit_log_entity"
        WHERE 1=1
      `;

      const parameters: any[] = [];
      let paramIndex = 1;

      if (username) {
        sql += ` AND "userDetails"->>'username' = $${paramIndex++}`;
        parameters.push(username);
      }

      if (email) {
        sql += ` AND "userDetails"->>'email' = $${paramIndex++}`;
        parameters.push(email);
      }

      if (day) {
        sql += ` AND DATE("timestamp") = $${paramIndex++}`;
        parameters.push(day);
      }

      if (tableName) {
        sql += ` AND "table_name" = $${paramIndex++}`;
        parameters.push(tableName);
      }

      sql += ` ORDER BY "timestamp" ${sortOrder}
              LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      parameters.push(limit, (page - 1) * limit);

      const result = await this.AuditLogRepository.query(sql, parameters);

      let countSql = `
        SELECT COUNT(*)
        FROM "audit_log_entity"
        WHERE 1=1
      `;

      const countParameters: any[] = [];
      let countParamIndex = 1;

      if (username) {
        countSql += ` AND "userDetails"->>'username' = $${countParamIndex++}`;
        countParameters.push(username);
      }

      if (email) {
        countSql += ` AND "userDetails"->>'email' = $${countParamIndex++}`;
        countParameters.push(email);
      }

      if (day) {
        countSql += ` AND DATE("timestamp") = $${countParamIndex++}`;
        countParameters.push(day);
      }

      if (tableName) {
        countSql += ` AND "table_name" = $${countParamIndex++}`;
        countParameters.push(tableName);
      }

      const [totalResult] = await this.AuditLogRepository.query(
        countSql,
        countParameters,
      );
      const total = parseInt(totalResult.count, 10);

      return this.formatResponse(result, total, page, limit);
    } catch (error) {
      console.error("Query Execution Error:", error.message);
      throw new BadRequestException("Error executing query");
    }
  }

  private validateSortParams(sortBy: string, sortOrder: string) {
    const validSortBy = ["timestamp"];
    const validSortOrder = ["ASC", "DESC"];

    if (!validSortBy.includes(sortBy)) {
      throw new BadRequestException(`Invalid sort field: ${sortBy}`);
    }

    if (!validSortOrder.includes(sortOrder)) {
      throw new BadRequestException(`Invalid sort order: ${sortOrder}`);
    }
  }

  private validateInputs(username: string, email: string, day: string) {
    if (username && typeof username !== "string") {
      throw new BadRequestException("Invalid username format");
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException("Invalid email format");
    }

    if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new BadRequestException("Invalid date format");
    }
  }

  private formatResponse(
    result: AuditLogEntity[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      items: result,
      meta: {
        totalItems: total,
        itemCount: result.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
