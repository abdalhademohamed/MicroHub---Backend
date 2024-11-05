import { Injectable, Scope, Inject } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class CustomI18nService {
  constructor(
    private i18nService: I18nService,
    @Inject(REQUEST) private request: Request
  ) {}

  translate(key: string, options?: any) {
    const lang = this.request.headers['lang'] as string || 'en';
    return this.i18nService.t(key, { lang, ...options });
  }
}
 