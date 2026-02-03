import { Controller, Get, Patch, Body, Req, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600000) // 10 minutes - user profile changes infrequently
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

