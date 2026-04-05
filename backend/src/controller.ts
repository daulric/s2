import { Controller, Get } from "@nestjs/common";

@Controller("")
export default class RootController {
    
    @Get()
    getRoot() {
        return {
            status: 'ok',
            message: "hello people, i'm working"
        }
    }

}