'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, MapPin, Users, Heart } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({ events: 0, families: 0, favorites: 0 });

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Family Fun Starts Here
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover amazing activities and events perfect for your family in Hong Kong
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/activities"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center space-x-2"
            >
              <span>Browse Activities</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/calendar"
              className="bg-white/20 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/30 transition border-2 border-white"
            >
              View Calendar
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">{stats.events}+</div>
              <p className="text-gray-600 font-medium">Activities & Events</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary-600 mb-2">{stats.families}+</div>
              <p className="text-gray-600 font-medium">Families Discovering</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-warning mb-2">{stats.favorites}+</div>
              <p className="text-gray-600 font-medium">Favorites Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose HK Family Fun?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Wide Selection</h3>
              <p className="text-gray-600">Thousands of curated family activities across all districts of Hong Kong</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Community Driven</h3>
              <p className="text-gray-600">Join thousands of families sharing their experiences and recommendations</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-bold text-lg mb-2">Save & Plan</h3>
              <p className="text-gray-600">Create wishlists and organize your perfect family outings with ease</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Plan Your Family Adventure?</h2>
          <p className="text-lg text-white/90 mb-8">Start exploring amazing activities today</p>
          <Link
            href="/activities"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition inline-flex items-center space-x-2"
          >
            <span>Get Started Now</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
