import ChatKitty, {
  Channel,
  ChatKittyPaginator,
  ChatSession,
  CurrentUser,
  GetChannelsSucceededResult,
  GetCountSucceedResult,
  GetMessagesSucceededResult,
  GetUsersSucceededResult,
  isDirectChannel,
  Message,
  StartedChatSessionResult,
  succeeded,
  User,
} from 'chatkitty';
import React, { ReactElement, useEffect, useState } from 'react';

import { SentMessageResult } from '../../../chatkitty-js/src';
import ChatKittyConfiguration from '../configuration/chatkitty';
import {
  isTextMessageDraft,
  MessageDraft,
  MessageDraftType,
  TextMessageDraft,
} from '../models/message-draft';
import { LayoutState, View } from '../navigation';

const kitty = ChatKitty.getInstance(ChatKittyConfiguration.API_KEY);

interface ChatAppContext {
  login: (username: string) => void;
  currentUser: CurrentUser | null;
  online: boolean;
  users: () => Promise<ChatKittyPaginator<User> | null>;
  joinedChannels: () => Promise<ChatKittyPaginator<Channel> | null>;
  channelDisplayName: (channel: Channel) => string;
  channelDisplayPicture: (channel: Channel) => string | null;
  channelUnreadMessagesCount: (channel: Channel) => Promise<number>;
  channelMessages: (
    channel: Channel
  ) => Promise<ChatKittyPaginator<Message> | null>;
  startChatSession: (
    channel: Channel,
    onReceivedMessage: (message: Message) => void
  ) => ChatSession | null;
  channel: Channel | null;
  messageDraft: TextMessageDraft;
  updateMessageDraft: (draft: TextMessageDraft) => void;
  discardMessageDraft: () => void;
  sendMessageDraft: (draft: MessageDraft) => void;
  loading: boolean;
  showMenu: () => void;
  hideMenu: () => void;
  showChannel: (channel: Channel) => void;
  layout: LayoutState;
  logout: () => void;
}

const initialValues: ChatAppContext = {
  login: () => {},
  currentUser: null,
  online: false,
  users: () => Promise.prototype,
  joinedChannels: () => Promise.prototype,
  channelDisplayName: () => '',
  channelDisplayPicture: () => null,
  channelUnreadMessagesCount: () => Promise.prototype,
  channelMessages: () => Promise.prototype,
  startChatSession: () => ChatSession.prototype,
  channel: null,
  messageDraft: {
    type: MessageDraftType.Text,
    text: '',
  },
  updateMessageDraft: () => {},
  discardMessageDraft: () => {},
  sendMessageDraft: () => {},
  loading: false,
  showMenu: () => {},
  hideMenu: () => {},
  showChannel: () => {},
  layout: { menu: false, chat: false },
  logout: () => {},
};

export const ChatAppContext = React.createContext(initialValues);

interface ChatAppContextProviderProps {
  children: ReactElement | JSX.Element[] | null;
}

const ChatAppContextProvider: React.FC<ChatAppContextProviderProps> = ({
  children,
}: ChatAppContextProviderProps) => {
  const [currentUser, setCurrentUser] = useState(initialValues.currentUser);
  const [online, setOnline] = useState(initialValues.online);
  const [channel, setChannel] = useState(initialValues.channel);
  const [messageDraft, setMessageDraft] = useState(initialValues.messageDraft);
  const [loading, setLoading] = useState(initialValues.loading);
  const [layout, setLayout] = useState(initialValues.layout);

  const views: Set<View> = new Set();

  const getLayout = (): LayoutState => {
    return {
      menu: views.has('Menu'),
      chat: views.has('Chat'),
    };
  };

  const showView = (view: View) => {
    views.add(view);

    setLayout(getLayout());
  };

  const hideView = (view: View) => {
    views.delete(view);

    setLayout(getLayout());
  };

  const showMenu = () => {
    showView('Menu');
  };

  const hideMenu = () => {
    hideView('Menu');
  };

  const showChannel = (channel: Channel) => {
    hideView('Menu');

    setChannel(channel);

    showView('Chat');
  };

  useEffect(() => {
    kitty.onCurrentUserChanged((user) => {
      setCurrentUser(user);
    });

    kitty.onCurrentUserOnline(() => {
      setOnline(true);
    });

    kitty.onCurrentUserOffline(() => {
      setOnline(false);
    });
  }, []);

  const login = async (username: string) => {
    setLoading(true);

    await kitty.startSession({ username: username });

    setLoading(false);
  };

  const users = async () => {
    const result = await kitty.getUsers();

    if (succeeded<GetUsersSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const joinedChannels = async () => {
    const result = await kitty.getChannels({
      filter: { joined: true },
    });

    if (succeeded<GetChannelsSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const channelDisplayName = (channel: Channel): string => {
    if (isDirectChannel(channel)) {
      return channel.members
        .filter((member) => member.id !== currentUser?.id)
        .map((member) => member.displayName)
        .join(', ');
    }

    return channel.name;
  };

  const channelDisplayPicture = (channel: Channel): string | null => {
    if (isDirectChannel(channel) && channel.members.length === 2) {
      return channel.members
        .filter((member) => member.id !== currentUser?.id)
        .map((member) => member.displayPictureUrl)[0];
    }

    return null;
  };

  const startChatSession = (
    channel: Channel,
    onReceivedMessage: (message: Message) => void
  ): ChatSession | null => {
    const result = kitty.startChatSession({ channel, onReceivedMessage });

    if (succeeded<StartedChatSessionResult>(result)) {
      return result.session;
    }

    return null;
  };

  const channelUnreadMessagesCount = async (channel: Channel) => {
    const result = await kitty.getUnreadMessagesCount({
      channel,
    });

    if (succeeded<GetCountSucceedResult>(result)) {
      return result.count;
    }

    return 0;
  };

  const channelMessages = async (channel: Channel) => {
    const result = await kitty.getMessages({
      channel,
    });

    if (succeeded<GetMessagesSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const updateMessageDraft = async (draft: TextMessageDraft) => {
    if (!channel) {
      return;
    }

    await kitty.sendKeystrokes({ channel, keys: draft.text });

    setMessageDraft(draft);
  };

  const discardMessageDraft = () => {
    setMessageDraft(initialValues.messageDraft);
  };

  const sendMessageDraft = async (draft: MessageDraft) => {
    if (!channel) {
      return;
    }

    if (isTextMessageDraft(draft)) {
      await kitty.sendMessage({
        channel: channel,
        body: draft.text,
      });

      discardMessageDraft();
    }
  };

  const logout = async () => {
    await kitty.endSession();
  };

  return (
    <ChatAppContext.Provider
      value={{
        showMenu,
        hideMenu,
        showChannel,
        currentUser,
        online,
        users,
        joinedChannels,
        channelDisplayName,
        channelDisplayPicture,
        channelUnreadMessagesCount,
        channelMessages,
        startChatSession,
        messageDraft,
        updateMessageDraft,
        discardMessageDraft,
        sendMessageDraft,
        channel,
        loading,
        layout,
        login,
        logout,
      }}
    >
      {children}
    </ChatAppContext.Provider>
  );
};

export default ChatAppContextProvider;
