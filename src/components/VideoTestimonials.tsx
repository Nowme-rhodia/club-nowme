import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';

const videos = [
    {
        id: 1,
        name: "Sarah, 27 ans",
        role: "Membre depuis 1 an",
        thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" // Placeholder
    },
    {
        id: 2,
        name: "Julie, 34 ans",
        role: "Membre depuis 6 mois",
        thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    },
    {
        id: 3,
        name: "Marie, 29 ans",
        role: "Membre depuis 3 mois",
        thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    }
];

export function VideoTestimonials() {
    const [selectedVideo, setSelectedVideo] = useState<typeof videos[0] | null>(null);

    return (
        <div className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Elles le racontent mieux que nous
                    </h2>
                    <p className="text-xl text-gray-600">
                        Découvre les histoires des membres de la communauté Nowme en vidéo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {videos.map((video) => (
                        <div
                            key={video.id}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer group relative"
                            onClick={() => setSelectedVideo(video)}
                        >
                            <div className="relative aspect-[9/16] md:aspect-video">
                                <img
                                    src={video.thumbnail}
                                    alt={video.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                                        <Play className="w-8 h-8 text-primary fill-current" />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                                    <h3 className="font-bold text-lg">{video.name}</h3>
                                    <p className="text-sm opacity-90">{video.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {selectedVideo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
                            onClick={() => setSelectedVideo(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setSelectedVideo(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <video
                                    src={selectedVideo.videoUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
