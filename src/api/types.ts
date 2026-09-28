/** Возможные состояния инстанса (getStateInstance). */
export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword';

export type GetStateInstanceResponse = {
  stateInstance: InstanceState;
};

export type GetSettingsResponse = {
  wid: string;
  webhookUrl: string;
  incomingWebhook: 'yes' | 'no';
  outgoingWebhook: 'yes' | 'no';
  stateWebhook: 'yes' | 'no';
  markIncomingMessagesReaded: 'yes' | 'no';
  delaySendMessagesMilliseconds: number;
};

export type SetSettingsResponse = {
  saveSettings: boolean;
};

export type CheckAccountSuccess = {
  exist: boolean;
  chatId: string;
  fromCache: boolean;
};

/** Инстанс ещё не авторизован или упёрся в лимит — HTTP при этом 200. */
export type CheckAccountFailure = {
  status: false;
  reason: string;
};

export type SendMessageResponse = {
  idMessage: string;
};

/** Уведомление из очереди (спека §6.4). Нас интересует только incomingMessageReceived + textMessage. */
export type NotificationBody = {
  typeWebhook: string;
  timestamp: number;
  idMessage: string;
  senderData?: {
    chatId: string;
    chatName?: string;
    senderName?: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
  };
};

export type NotificationReceipt = {
  receiptId: number;
  body: NotificationBody;
};

export type DeleteNotificationResponse = {
  result: boolean;
  reason: string;
};
