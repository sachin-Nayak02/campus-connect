import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { getMediaUrl, formatTimeAgo } from '../utils/media';
import toast from 'react-hot-toast';
import {
  Send,
  Paperclip,
  Users,
  Plus,
  MessageSquare,
  CheckCheck,
  X
} from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  // Group creation modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch conversations
  const fetchChats = async () => {
    try {
      const res = await api.get('/chats');
      if (res.data.success) {
        setChats(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Fetch chats error:', err);
    } finally {
      setLoadingChats(false);
    }
    return [];
  };

  // 2. Handle targetUserId query param from profile or feed
  useEffect(() => {
    const initChats = async () => {
      const loadedChats = await fetchChats();

      if (targetUserId) {
        try {
          const res = await api.post('/chats/direct', { participantId: targetUserId });
          if (res.data.success) {
            const chatObj = res.data.data;
            setActiveChat(chatObj);
            await fetchChats();
          }
        } catch (err) {
          console.error('Direct chat error:', err);
        }
      } else if (loadedChats.length > 0 && !activeChat) {
        setActiveChat(loadedChats[0]);
      }
    };

    initChats();
  }, [targetUserId]);

  // 3. Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/chats/${activeChat.id}/messages`);
        if (res.data.success) {
          setMessages(res.data.data);
        }
      } catch (err) {
        console.error('Fetch messages error:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Join room via socket
    if (socket) {
      socket.emit('join_chat', activeChat.id);
    }

    return () => {
      if (socket) {
        socket.emit('leave_chat', activeChat.id);
      }
    };
  }, [activeChat?.id, socket]);

  // 4. Socket real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (activeChat && message.chatId === activeChat.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      // Refresh chat list to update last message
      fetchChats();
    };

    const handleUserTyping = (data) => {
      if (activeChat && data.chatId === activeChat.id && data.userId !== user?.id) {
        setTypingUser(data.fullName);
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (activeChat && data.chatId === activeChat.id) {
        setTypingUser(null);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [socket, activeChat?.id]);

  // 5. Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Handle typing indicator emission
  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (!socket || !activeChat) return;

    socket.emit('typing_start', { chatId: activeChat.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { chatId: activeChat.id });
    }, 1500);
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !mediaFile) return;

    try {
      const formData = new FormData();
      if (messageText.trim()) formData.append('content', messageText.trim());
      if (mediaFile) formData.append('media', mediaFile);

      const res = await api.post(`/chats/${activeChat.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const sentMsg = res.data.data;
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
        setMessageText('');
        removeMedia();
        if (socket) {
          socket.emit('typing_stop', { chatId: activeChat.id });
        }
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  // Open Group Modal
  const openGroupModal = async () => {
    try {
      const res = await api.get('/users/friends');
      if (res.data.success) {
        setFriendsList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setGroupModalOpen(true);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Enter group name');
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error('Select at least one classmate');
      return;
    }

    setCreatingGroup(true);
    try {
      const res = await api.post('/chats/group', {
        groupName: groupName.trim(),
        memberIds: selectedFriends
      });

      if (res.data.success) {
        toast.success('Group chat created!');
        setGroupModalOpen(false);
        setGroupName('');
        setSelectedFriends([]);
        await fetchChats();
        setActiveChat(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex gap-4 h-[calc(100vh-5rem)]">
        {/* Left: Chat Threads List */}
        <div className="w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Messages</h2>
            <button
              onClick={openGroupModal}
              className="px-2.5 py-1.5 bg-campus-50 hover:bg-campus-100 text-campus-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Group
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingChats ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="flex gap-3 items-center animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chats.length > 0 ? (
              chats.map((chat) => {
                const isSelected = activeChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition ${
                      isSelected ? 'bg-campus-50/80 border-l-4 border-campus-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar
                      src={chat.photo}
                      name={chat.name || 'Chat'}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {chat.name || 'Campus Conversation'}
                        </span>
                        {chat.lastMessage && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {chat.lastMessage ? chat.lastMessage.content || 'Media attachment' : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No active conversations.</p>
                <p className="mt-1">Connect with classmates to start chatting!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Chat Room */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeChat.photo}
                    name={activeChat.name || 'Chat'}
                    size="md"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeChat.name || activeChat.groupName || 'Conversation'}</h3>
                    <p className="text-[11px] text-slate-500">
                      {activeChat.type === 'group'
                        ? `${activeChat.members?.length || 'Group'} members`
                        : 'Direct message'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
                {loadingMessages ? (
                  <p className="text-xs text-slate-400 text-center py-6">Loading messages...</p>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    const media = msg.media?.[0];

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <Avatar
                            src={msg.sender?.profilePhoto}
                            name={msg.sender?.fullName}
                            size="sm"
                          />
                        )}

                        <div
                          className={`max-w-md rounded-2xl p-3 text-xs shadow-xs ${
                            isMe
                              ? 'bg-campus-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-xs'
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[10px] font-bold text-campus-600 mb-1">
                              {msg.sender?.fullName}
                            </p>
                          )}

                          {media && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                              {media.type === 'video' ? (
                                <video
                                  src={getMediaUrl(media.url)}
                                  controls
                                  className="w-full max-h-48 object-cover"
                                />
                              ) : (
                                <img
                                  src={getMediaUrl(media.url)}
                                  alt="attachment"
                                  className="w-full max-h-48 object-cover"
                                />
                              )}
                            </div>
                          )}

                          {msg.content && <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>}

                          <div
                            className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                              isMe ? 'text-campus-200' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    Say hello to start the conversation!
                  </div>
                )}

                {/* Typing Indicator */}
                {typingUser && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <span className="inline-block w-2 h-2 rounded-full bg-campus-400 animate-ping" />
                    <span>{typingUser} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Media Preview before send */}
              {mediaPreview && (
                <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold">Attached:</span>
                    <span>{mediaFile?.name}</span>
                  </div>
                  <button onClick={removeMedia} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-campus-600 hover:bg-slate-100 rounded-xl transition"
                  title="Attach media"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 transition"
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() && !mediaFile}
                  className="p-2.5 bg-campus-600 hover:bg-campus-700 text-white rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-campus-50 text-campus-600 rounded-2xl flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Select a conversation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Pick a chat from the left panel or click "New Group" to create a campus group.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Group Modal */}
      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Create Campus Group Chat"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Group Title</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. AI Project Team, CS 3rd Year"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Friends to Add ({selectedFriends.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {friendsList.length > 0 ? (
                friendsList.map(f => {
                  const isChecked = selectedFriends.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedFriends(prev => prev.filter(id => id !== f.id));
                          } else {
                            setSelectedFriends(prev => [...prev, f.id]);
                          }
                        }}
                        className="rounded text-campus-600"
                      />
                      <Avatar src={f.profilePhoto} name={f.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{f.fullName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{f.rollNumber} • {f.branch}</p>
                      </div>
                    </label>
                  );
                })
              ) : (
                <p className="p-4 text-xs text-slate-400 text-center">No friends available yet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGroupModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingGroup}
              className="px-5 py-2 text-xs font-bold text-white bg-campus-600 hover:bg-campus-700 rounded-xl disabled:opacity-50"
            >
              {creatingGroup ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
