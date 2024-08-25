import { Injectable } from "@nestjs/common";
import { I18nContext, I18nService } from "nestjs-i18n";


@Injectable()
export class CustomI18nService{

    constructor(private  I18nService:I18nService){}

    translate(key:string , options?:any){

        const lang = I18nContext.current().lang
        return this.I18nService.t(key,{lang,...options})
    }
}