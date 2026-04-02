import { Controller, Get, UseGuards, Param, Query, BadRequestException, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CensusService } from "./census.service";
import { SupabaseAuthGuard } from "src/auth/supabase-auth.guard";
import { SupabaseService } from "src/supabase/supabase.service";

@Controller("census")
export class CensusController {
    private readonly api_url: string;

    constructor(
        private readonly censusService: CensusService,
        private readonly supabase: SupabaseService,
        private readonly configService: ConfigService,
    ) {
        this.api_url = this.configService.get<string>("CENSUS_API_KEY") ?? '';
    }

    @Get(":country/election-results/:type/:year")
    @UseGuards(SupabaseAuthGuard)
    async getResults(
        @Param("country") country: string, 
        @Param("type") type: string,
        @Param("year") year: string
    ) {
        if (!country || !type) {
            throw new BadRequestException("Country and type are required");
        }

        if (country !== "grenada") {
            throw new BadRequestException("Country not supported");
        }

        const url = `${this.api_url}/${year}/election_${type}.json`;

        const res = await fetch(url);

        if (!res.ok) {
            throw new HttpException(
                `not found`,
                res.status,
            );
        }

        return await res.json();
    }

    @Get("grenada/available-years")
    @UseGuards(SupabaseAuthGuard)
    async getAvailableYears() {
        const res = await fetch(`${this.api_url}`);

        if (!res.ok) {
            throw new Error("Failed to fetch available years");
        }

        const data = await res.json();

        return data.years;

    }

}