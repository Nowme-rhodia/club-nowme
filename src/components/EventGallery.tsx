import React from 'react';
import { motion } from 'framer-motion';

const events = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&q=80&w=600",
        title: "Apéro sur la Seine",
        date: "Juin 2024"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=600",
        title: "Atelier Cocktail",
        date: "Mai 2024"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=600",
        title: "Soirée Rooftop",
        date: "Avril 2024"
    },
    {
        id: 4,
        image: "https://images.unsplash.com/photo-1514525253440-b393332569ca?auto=format&fit=crop&q=80&w=600",
        title: "Dégustation Vin",
        date: "Mars 2024"
    },
    {
        id: 5,
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600",
        title: "Festival Nowme",
        date: "Sept 2024"
    },
    {
        id: 6,
        image: "https://images.unsplash.com/photo-1475721027767-f4240295bd43?auto=format&fit=crop&q=80&w=600",
        title: "Week-end Surf",
        date: "Juillet 2024"
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

                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
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
