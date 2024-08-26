import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    public transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.NodeMailer_HOST,
            service: 'gmail', // Using Gmail service

            // port: 587,
            auth: {
                user: process.env.NodeMailer_USER,
                pass: process.env.NodeMailer_PW,
            },
        });
    }
}
