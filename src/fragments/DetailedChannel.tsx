import React, { useContext, useEffect, useState } from 'react';

import { Channel } from '../../../chatkitty-js';
import { ChatAppContext } from '../providers/ChatAppProvider';
import { DetailedChannelView } from '../ui-kit/components/chat/channel/detailed-channel-view';

interface DetailedChannelViewProps {
  channel: Channel;
}

const DetailedChannel: React.FC<DetailedChannelViewProps> = ({
  channel,
}: DetailedChannelViewProps) => {
  const {
    chatSession,
    channelDisplayName,
    channelDisplayPicture,
    channelUnreadMessagesCount,
    startChatSession,
  } = useContext(ChatAppContext);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    channelUnreadMessagesCount(channel).then((count) =>
      setUnreadMessagesCount(count)
    );
  }, [channel]);

  return (
    <DetailedChannelView
      id={channel.id}
      name={channelDisplayName(channel)}
      displayPicture={channelDisplayPicture(channel)}
      onLeave={() => {
        // TODO
      }}
      selected={channel.id === chatSession?.channel.id}
      key={channel.id}
      unreadMessageCount={unreadMessagesCount}
      onClick={() => startChatSession(channel)}
    ></DetailedChannelView>
  );
};

export default DetailedChannel;