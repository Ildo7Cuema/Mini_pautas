/*
component-meta:
  name: NotificationItem
  description: Individual notification item component
  tokens: [--color-primary, --fs-sm, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { Notification, getNotificationIcon, getRelativeTime } from '../utils/notificationUtils'

interface NotificationItemProps {
    notification: Notification
    onMarkAsRead: (id: string) => void
    onClick: (notification: Notification) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onMarkAsRead,
    onClick
}) => {
    const iconConfig = getNotificationIcon(notification.tipo)
    const relativeTime = getRelativeTime(notification.created_at)

    const handleClick = () => {
        if (!notification.lida) {
            onMarkAsRead(notification.id)
        }
        onClick(notification)
    }

    return (
        <div
            onClick={handleClick}
            className={`
        p-3 border-b border-slate-100 cursor-pointer transition-colors
        hover:bg-slate-50 min-h-touch
        ${!notification.lida ? 'bg-blue-50' : 'bg-white'}
      `}
        >
            <div className="flex gap-3">
                {/* Icon */}
                <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${iconConfig.bgColor} ${iconConfig.color}
        `}>
                    {iconConfig.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`
              text-sm truncate
              ${!notification.lida ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}
            `}>
                            {notification.titulo}
                        </h4>
                        {!notification.lida && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                    </div>

                    {notification.mensagem && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {notification.mensagem}
                        </p>
                    )}

                    <p className="text-xs text-slate-400 mt-1">
                        {relativeTime}
                    </p>
                </div>
            </div>
        </div>
    )
}
