import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator'
import { UsersService } from './users.service'

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.me(user.id)
  }
}