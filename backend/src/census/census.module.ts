import { Module } from "@nestjs/common";
import { CensusController } from "./census.controller"
import { CensusService } from "./census.service"
import { AuthModule } from "../auth/auth.module"


@Module({
    imports: [AuthModule],
    controllers: [CensusController],
    providers: [CensusService],
    exports: [CensusService],
})
export class CensusModule {}