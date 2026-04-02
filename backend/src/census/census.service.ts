import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CensusService {
    constructor(private readonly configService: ConfigService) {
        
    }
}