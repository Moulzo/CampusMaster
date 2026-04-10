import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrivateMessagesService } from './private-messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendPrivateMessageDto } from './dto/send-private-message.dto';

@ApiTags('PrivateMessages')
@ApiBearerAuth('access-token')
@Controller('private-messages')
@UseGuards(JwtAuthGuard)
export class PrivateMessagesController {
  constructor(private readonly privateMessagesService: PrivateMessagesService) {}

  @Get('users/search')
  @ApiOperation({ summary: 'Search users for private messaging' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by full name or email (minimum 2 characters)',
    example: 'abdou',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  searchUsers(@Req() req: any, @Query('q') q = '') {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.searchUsers(currentUserId, q);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  listConversations(@Req() req: any) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.listConversations(currentUserId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new private conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.createConversation(currentUserId, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  getConversation(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.getConversation(id, currentUserId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages from a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  listMessages(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.listMessages(id, currentUserId);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  sendMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: SendPrivateMessageDto,
  ) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.sendMessage(id, currentUserId, dto);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user.id ?? req.user.sub;
    return this.privateMessagesService.markAsRead(id, currentUserId);
  }
}
