const prisma = require('../config/db');
const ApiResponse = require('../utils/response');

exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    rollNumber: true,
                    profilePhoto: true,
                    branch: true
                  }
                }
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: { id: true, fullName: true }
                }
              }
            }
          }
        }
      }
    });

    const chats = memberships.map(m => {
      const chat = m.chat;
      let displayName = chat.groupName;
      let displayPhoto = chat.groupAvatar;

      if (chat.type === 'direct') {
        const otherMember = chat.members.find(member => member.userId !== userId);
        if (otherMember) {
          displayName = otherMember.user.fullName;
          displayPhoto = otherMember.user.profilePhoto;
        }
      }

      const lastMessage = chat.messages[0] || null;

      return {
        id: chat.id,
        type: chat.type,
        name: displayName,
        photo: displayPhoto,
        lastMessage,
        members: chat.members.map(mb => mb.user),
        updatedAt: lastMessage ? lastMessage.createdAt : chat.createdAt
      };
    });

    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return ApiResponse.success(res, 'Chats fetched', chats);
  } catch (error) {
    console.error('Get chats error:', error);
    return ApiResponse.error(res, 'Failed to fetch conversations', 500);
  }
};

const formatChat = (chat, userId) => {
  let displayName = chat.groupName;
  let displayPhoto = chat.groupAvatar;

  if (chat.type === 'direct') {
    const otherMember = chat.members?.find(member => member.userId !== userId);
    if (otherMember?.user) {
      displayName = otherMember.user.fullName;
      displayPhoto = otherMember.user.profilePhoto;
    }
  }

  const lastMessage = chat.messages?.[0] || null;

  return {
    id: chat.id,
    type: chat.type,
    name: displayName || chat.groupName || 'Chat',
    photo: displayPhoto || chat.groupAvatar || null,
    lastMessage,
    members: chat.members?.map(mb => mb.user || mb) || [],
    updatedAt: lastMessage ? lastMessage.createdAt : chat.createdAt
  };
};

exports.createOrGetDirectChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    if (!participantId || participantId === userId) {
      return ApiResponse.error(res, 'Valid participant ID is required', 400);
    }

    // Find direct chat containing both members
    const existingChats = await prisma.chat.findMany({
      where: {
        type: 'direct',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: participantId } } }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, rollNumber: true, profilePhoto: true }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (existingChats.length > 0) {
      return ApiResponse.success(res, 'Existing chat found', formatChat(existingChats[0], userId));
    }

    // Create new direct chat
    const newChat = await prisma.chat.create({
      data: {
        type: 'direct',
        members: {
          create: [
            { userId, role: 'member' },
            { userId: participantId, role: 'member' }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, rollNumber: true, profilePhoto: true }
            }
          }
        }
      }
    });

    return ApiResponse.success(res, 'Chat created', formatChat(newChat, userId), 201);
  } catch (error) {
    console.error('Direct chat error:', error);
    return ApiResponse.error(res, 'Failed to start chat', 500);
  }
};

exports.createGroupChat = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body;
    const userId = req.user.id;

    if (!groupName || !groupName.trim()) {
      return ApiResponse.error(res, 'Group name is required', 400);
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return ApiResponse.error(res, 'At least one friend must be added to the group', 400);
    }

    // Unique members list including creator
    const allMembers = Array.from(new Set([userId, ...memberIds]));

    const group = await prisma.chat.create({
      data: {
        type: 'group',
        groupName: groupName.trim(),
        createdById: userId,
        members: {
          create: allMembers.map(mId => ({
            userId: mId,
            role: mId === userId ? 'admin' : 'member'
          }))
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, rollNumber: true, profilePhoto: true }
            }
          }
        }
      }
    });

    return ApiResponse.success(res, 'Group created successfully!', formatChat(group, userId), 201);
  } catch (error) {
    console.error('Create group error:', error);
    return ApiResponse.error(res, 'Failed to create group', 500);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        chatId_userId: { chatId, userId }
      }
    });

    if (!membership) {
      return ApiResponse.error(res, 'You are not a member of this chat', 403);
    }

    const messages = await prisma.message.findMany({
      where: { chatId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true
          }
        },
        media: true
      }
    });

    return ApiResponse.success(res, 'Messages fetched', messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return ApiResponse.error(res, 'Failed to fetch messages', 500);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const file = req.file;

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        chatId_userId: { chatId, userId }
      }
    });

    if (!membership) {
      return ApiResponse.error(res, 'You are not authorized to send messages in this chat', 403);
    }

    if (!content && !file) {
      return ApiResponse.error(res, 'Message cannot be empty', 400);
    }

    let mediaData = null;
    if (file) {
      const isVideo = file.mimetype.startsWith('video');
      mediaData = {
        url: `/uploads/chat/${file.filename}`,
        type: isVideo ? 'video' : 'image'
      };
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: content ? content.trim() : '',
        media: mediaData ? { create: [mediaData] } : undefined
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true
          }
        },
        media: true
      }
    });

    // Notify other members via socket (if socket instance exists on app)
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('receive_message', message);
    }

    return ApiResponse.success(res, 'Message sent', message, 201);
  } catch (error) {
    console.error('Send message error:', error);
    return ApiResponse.error(res, 'Failed to send message', 500);
  }
};
