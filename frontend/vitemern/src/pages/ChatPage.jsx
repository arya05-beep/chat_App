import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Send, User, LogOut, Search, X, Image, Paperclip, Camera, File } from "lucide-react";

const ChatPage = () => {
  const {
    messages,
    users,
    selectedUser,
    isUsersLoading,
    isMessagesLoading,
    onlineUsers,
    isTyping,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    emitTyping,
    emitStopTyping,
  } = useChatStore();

  const { authUser, logout, updateProfile, isUpdatingProfile } = useAuthStore();
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showProfilePicUpload, setShowProfilePicUpload] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const profilePicInputRef = useRef(null);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Subscribe to socket messages
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  // Fetch users on mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser, getMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleProfilePicSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateProfile(reader.result);
        setShowProfilePicUpload(false);
      } catch (error) {
        alert('Failed to update profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (selectedUser) {
      emitTyping(selectedUser._id);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(selectedUser._id);
      }, 2000);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setSelectedFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(null);
      setSelectedFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !selectedUser || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        text: messageText,
        image: selectedFile,
        receiverId: selectedUser._id,
      });
      setMessageText("");
      removeImage();
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        emitStopTyping(selectedUser._id);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to format date
  const formatMessageDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = formatMessageDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navbar */}
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-red-400 bg-clip-text text-transparent">
              Chat App
            </h1>
          </div>
          
          {authUser && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 relative">
                <div 
                  className="avatar cursor-pointer group relative"
                  onClick={() => setShowProfilePicUpload(!showProfilePicUpload)}
                >
                  <div className="w-10 h-10 rounded-full ring-2 ring-purple-400 overflow-hidden">
                    {authUser.profilePic ? (
                      <img src={authUser.profilePic} alt={authUser.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center bg-gray-700 w-full h-full">
                        <User className="w-6 h-6 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all">
                    <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                {showProfilePicUpload && (
                  <div className="absolute top-12 left-0 bg-gray-700 rounded-lg shadow-xl p-3 z-50 border border-gray-600">
                    <input
                      ref={profilePicInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => profilePicInputRef.current?.click()}
                      disabled={isUpdatingProfile}
                      className="btn btn-sm bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white border-none w-full"
                    >
                      {isUpdatingProfile ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                <span className="font-medium text-gray-200">{authUser.fullName}</span>
              </div>
              <button
                onClick={logout}
                className="btn btn-sm btn-ghost gap-2 hover:bg-red-900 hover:text-red-300 text-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
          <div className="flex h-full">
            {/* Sidebar - Users List */}
            <div className="w-80 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 flex flex-col">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-red-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-3">
                  <User className="w-5 h-5" />
                  Contacts
                  <span className="ml-auto text-sm bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    {users.length}
                  </span>
                </h2>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full pl-10 pr-10 py-2 bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isUsersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="loading loading-spinner loading-lg text-purple-400"></span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    {searchQuery ? "No contacts found" : "No users available"}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user._id);
                      return (
                        <div
                          key={user._id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                            selectedUser?._id === user._id
                              ? "bg-gradient-to-r from-purple-600 to-red-600 shadow-md scale-105"
                              : "hover:bg-gray-700 hover:shadow-md"
                          }`}
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full ring-2 ring-purple-300 overflow-hidden">
                              {user.profilePic ? (
                                <img src={user.profilePic} alt={user.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center bg-gray-600 w-full h-full">
                                  <User className="w-6 h-6 text-gray-300" />
                                </div>
                              )}
                            </div>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-100 truncate">
                              {user.fullName}
                            </p>
                            <p className="text-sm text-gray-400 truncate">{user.email}</p>
                          </div>
                          {isOnline && (
                            <div className="text-xs text-green-400 font-semibold">
                              ●
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-700 flex items-center gap-3 shadow-lg">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full ring-2 ring-purple-400 ring-offset-2 overflow-hidden">
                        {selectedUser.profilePic ? (
                          <img src={selectedUser.profilePic} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center bg-gray-600 w-full h-full">
                            <User className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                      {onlineUsers.includes(selectedUser._id) && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-100">{selectedUser.fullName}</h3>
                      <p className="text-sm text-gray-400">
                        {onlineUsers.includes(selectedUser._id) ? '🟢 Online' : '⚫ Offline'}
                      </p>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-gray-800" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Cdefs%3E%3Cstyle%3E.pattern%7Bfill:none;stroke:%23ffffff;stroke-width:0.5;opacity:0.03%7D%3C/style%3E%3C/defs%3E%3Cg class=%22pattern%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22/%3E%3Crect x=%22100%22 y=%2230%22 width=%2240%22 height=%2240%22 rx=%225%22/%3E%3Cpath d=%22M200,50 l20,-20 l20,20 l-20,20 z%22/%3E%3Cellipse cx=%22300%22 cy=%2260%22 rx=%2225%22 ry=%2215%22/%3E%3Cpolygon points=%22350,40 370,70 330,70%22/%3E%3Ccircle cx=%2275%22 cy=%22150%22 r=%2215%22/%3E%3Crect x=%22150%22 y=%22130%22 width=%2230%22 height=%2230%22 rx=%2215%22/%3E%3Cpath d=%22M250,140 Q270,120 290,140 T330,140%22/%3E%3Cstar cx=%2250%22 cy=%22250%22 r=%2220%22/%3E%3Ccircle cx=%22150%22 cy=%22250%22 r=%2218%22/%3E%3Crect x=%22230%22 y=%22230%22 width=%2235%22 height=%2235%22/%3E%3Cellipse cx=%22330%22 cy=%22260%22 rx=%2220%22 ry=%2212%22/%3E%3Cpolygon points=%22370,240 385,270 355,270%22/%3E%3Ccircle cx=%2280%22 cy=%22350%22 r=%2222%22/%3E%3Cpath d=%22M180,330 l-15,30 l30,0 z%22/%3E%3Crect x=%22260%22 y=%22330%22 width=%2238%22 height=%2238%22 rx=%228%22/%3E%3Cellipse cx=%22350%22 cy=%22360%22 rx=%2228%22 ry=%2218%22/%3E%3C/g%3E%3C/svg%3E')", backgroundRepeat: "repeat", backgroundSize: "200px 200px"}}>
                    {isMessagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <span className="loading loading-spinner loading-lg text-purple-400"></span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 text-lg mb-2">No messages yet</p>
                          <p className="text-gray-500 text-sm">Send a message to start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                          <div key={date}>
                            {/* Date Separator */}
                            <div className="flex items-center justify-center my-4 animate-fade-in">
                              <div className="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300 shadow-lg">
                                {date}
                              </div>
                            </div>
                            
                            {/* Messages for this date */}
                            {dateMessages.map((message, index) => {
                              const isOwnMessage = message.senderId === authUser._id;
                              const showAvatar = index === 0 || dateMessages[index - 1].senderId !== message.senderId;
                              
                              return (
                                <div
                                  key={message._id}
                                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${showAvatar ? 'mt-4' : 'mt-1'} animate-slide-in`}
                                >
                                  {!isOwnMessage && (
                                    <div className="mr-2">
                                      {showAvatar ? (
                                        <div className="w-8 h-8 rounded-full overflow-hidden">
                                          {selectedUser.profilePic ? (
                                            <img src={selectedUser.profilePic} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="flex items-center justify-center bg-gray-600 w-full h-full">
                                              <User className="w-4 h-4 text-gray-300" />
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-8"></div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div
                                    className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-2xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                                      isOwnMessage
                                        ? "bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-br-sm"
                                        : "bg-gray-700 text-gray-100 rounded-bl-sm"
                                    }`}
                                  >
                                    {message.image && (
                                      <img
                                        src={message.image}
                                        alt="attachment"
                                        className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(message.image, '_blank')}
                                      />
                                    )}
                                    {message.text && <p className="break-words">{message.text}</p>}
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                      <p
                                        className={`text-xs ${
                                          isOwnMessage
                                            ? "text-purple-200"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        {new Date(message.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                      {isOwnMessage && (
                                        <span className="text-xs text-purple-200 ml-1">
                                          {message.status === "read" && "✓✓"}
                                          {message.status === "delivered" && "✓✓"}
                                          {message.status === "sent" && "✓"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        
                        {/* Typing Indicator */}
                        {isTyping && (
                          <div className="flex justify-start items-center gap-2 mt-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              {selectedUser.profilePic ? (
                                <img src={selectedUser.profilePic} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center bg-gray-600 w-full h-full">
                                  <User className="w-4 h-4 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-md">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mb-3 relative inline-block">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-40 rounded-lg border-2 border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-center">
                      {/* Hidden File Inputs */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                        onChange={handleDocumentSelect}
                        className="hidden"
                      />
                      
                      {/* Image Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-circle bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                        title="Attach image"
                      >
                        <Image className="w-5 h-5" />
                      </button>
                      
                      {/* File Upload Button */}
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="btn btn-circle bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Type a message..."
                        className="flex-1 input input-bordered bg-gray-700 text-gray-100 border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full placeholder-gray-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={(!messageText.trim() && !selectedFile) || isSending}
                        className={`btn btn-circle border-none transition-all ${
                          (messageText.trim() || selectedFile) && !isSending
                            ? 'bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isSending ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-gray-800">
                  <div className="text-center">
                    <MessageSquare className="w-24 h-24 text-purple-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-200 mb-2">Welcome to Chat App</h3>
                    <p className="text-gray-400">Select a contact to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
