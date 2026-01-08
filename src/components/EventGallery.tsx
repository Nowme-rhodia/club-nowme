import React from 'react';
import { motion } from 'framer-motion';

const events = [
    {
        id: 7,
        image: "/images/NOWME-Karaoke-2024 (69).jpg",
        title: "Karaoké Party",
        date: "Mars 2024"
    },
    {
        id: 2,
        image: "/images/2025-fevrier-NOWME-clubbing (77).jpg",
        title: "Soirée Clubbing",
        date: "Février 2025"
    },
    {
        id: 11,
        image: "/images/IMG_20241012_125525_1.jpg",
        title: "Séjour à Marrakech",
        date: "Oct 2024"
    },
    {
        id: 4,
        image: "/images/NOWME-Karaoke-2024 (20).jpg",
        title: "Karaoké & massage",
        date: "Mars 2024"
    },
    {
        id: 6,
        image: "/images/Sport-NOWME (34).jpg",
        title: "Session Sport",
        date: "Juillet 2024"
    },
    {
        id: 1,
        image: "/images/2024-Nowme-brunch (30).jpg",
        title: "Brunch & paint",
        date: "Juin 2024"
    },
    {
        id: 9,
        image: "/images/IMG_20250523_190803.jpg",
        title: "Séjour en grèce",
        date: "Mai 2025"
    },
    {
        id: 3,
        image: "/images/2024-soiree-pyjama-NOWME-053.jpg",
        title: "Soirée Pyjama",
        date: "Avril 2024"
    },
    {
        id: 12,
        image: "/images/IMG_20240407_194459.jpg",
        title: "Game night",
        date: "Avril 2024"
    },
    {
        id: 5,
        image: "/images/2024-Nowme-brunch (41).jpg",
        title: "Brunch entre filles",
        date: "Sept 2024"
    },
    {
        id: 14,
        image: "/images/20250219_204444.jpg",
        title: "Séjour en Laponie",
        date: "Fév 2025"
    },
    {
        id: 8,
        image: "/images/IMG_6826.JPEG",
        title: "Pole dance & Massage",
        date: "2024"
    },
    {
        id: 13,
        image: "/images/20250523_160815.jpg",
        title: "Séjour entre filles",
        date: "Mai 2025"
    },
    {
        id: 10,
        image: "/images/IMG_20250216_153538.jpg",
        title: "Ski Arctique",
        date: "Fév 2025"
    }
];

export function EventGallery() {
    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-4">
                        📸 La Vraie Vie
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Pas de filtres, que du kiff
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Voici à quoi ressemblent nos vrais événements. Des sourires, des rencontres et des moments inoubliables.
                    </p>
                </div>

                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {events.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-lg"
                        >
                            <img
                                src={event.image}
                                alt={event.title}
                                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <span className="text-white font-bold text-lg">{event.title}</span>
                                <span className="text-white/80 text-sm">{event.date}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
