import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.usersService.findById(userId);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user.userId;
    return this.usersService.update(userId, updateUserDto);
  }
}

