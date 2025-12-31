import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Info, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

type Notification = {
    id: string;
    title: string;
    content: string;
    type: string;
    read_status: boolean;
    created_at: string;
    data: any;
};

export default function NotificationCenter() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch partner ID
    const [partnerId, setPartnerId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const getPartnerId = async () => {
            // Try profile first
            if (profile?.partner_id) {
                setPartnerId(profile.partner_id);
                return;
            }
            // Fallback
            const { data } = await supabase
                .from('user_profiles')
                .select('partner_id')
                .eq('user_id', user.id)
                .single();
            if (data?.partner_id) setPartnerId(data.partner_id);
        };
        getPartnerId();
    }, [user, profile]);

    useEffect(() => {
        if (!partnerId) return;

        fetchNotifications();

        // Subscribe to changes
        const subscription = supabase
            .channel('partner_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'partner_notifications',
                    filter: `partner_id=eq.${partnerId}`
                },
                (payload) => {
                    const newNote = payload.new as Notification;
                    setNotifications(prev => [newNote, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [partnerId]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const fetchNotifications = async () => {
        if (!partnerId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('partner_notifications')
            .select('*')
            .eq('partner_id', partnerId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read_status).length);
        }
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        if (!partnerId) return;
        const { error } = await supabase
            .from('partner_notifications')
            .update({ read_status: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllRead = async () => {
        if (!partnerId) return;
        await supabase
            .from('partner_notifications')
            .update({ read_status: true })
            .eq('partner_id', partnerId)
            .eq('read_status', false);

        setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
        setUnreadCount(0);
    }

    const handleNotificationClick = (n: Notification) => {
        if (!n.read_status) {
            markAsRead(n.id);
        }

        // Navigation logic based on type
        if (n.type === 'new_booking' || n.type === 'booking_cancelled') {
            navigate('/partner/bookings');
        } else if (n.type === 'review_received') {
            // navigate('/partner/reviews'); // Future
        }
        setIsOpen(false);
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'new_booking': return <Calendar className="w-5 h-5 text-primary" />;
            case 'booking_cancelled': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'profile_approved': return <Check className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="relative mr-4" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                            >
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400 text-sm">Chargement...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                                <Bell className="w-8 h-8 mb-2 text-gray-300" />
                                Aucune notification pour le moment
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read_status ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="p-4 flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${!notification.read_status ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.content}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                                                </p>
                                            </div>
                                            {!notification.read_status && (
                                                <div className="flex-shrink-0 self-center">
                                                    <span className="block w-2 h-2 bg-blue-500 rounded-full"></span>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-gray-50 bg-gray-50 text-center">
                        <button
                            className="text-xs text-gray-500 hover:text-gray-700 transition"
                            onClick={() => setIsOpen(false)}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
