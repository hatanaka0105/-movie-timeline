import { useState } from 'react';
import { Movie } from '../types/movie.types';
import { useLanguage } from '../i18n/LanguageContext';

interface MovieInputFormProps {
  onAddMovie: (movie: Movie) => void;
}

export default function MovieInputForm({ onAddMovie }: MovieInputFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    year: '',
    startYear: '',
    endYear: '',
    period: '',
    genre: '',
    synopsis: '',
    posterUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const movie: Movie = {
      id: Date.now().toString(),
      title: formData.title,
      year: parseInt(formData.year) || new Date().getFullYear(),
      posterUrl: formData.posterUrl,
      timeline: {
        startYear: formData.startYear ? parseInt(formData.startYear) : null,
        endYear: formData.endYear ? parseInt(formData.endYear) : null,
        period: formData.period,
      },
      genre: formData.genre ? formData.genre.split(',').map(g => g.trim()) : [],
      synopsis: formData.synopsis,
    };

    onAddMovie(movie);

    // フォームをリセット
    setFormData({
      title: '',
      year: '',
      startYear: '',
      endYear: '',
      period: '',
      genre: '',
      synopsis: '',
      posterUrl: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">{t.manualInput}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t.movieTitleRequired}
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder={t.titlePlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t.releaseYear}
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t.releasePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t.startYearSetting}
            </label>
            <input
              type="number"
              name="startYear"
              value={formData.startYear}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t.startYearPlaceholder}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t.endYearSetting}
            </label>
            <input
              type="number"
              name="endYear"
              value={formData.endYear}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t.endYearPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t.periodDescription}
            </label>
            <input
              type="text"
              name="period"
              value={formData.period}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={t.periodPlaceholder}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t.genreComma}
          </label>
          <input
            type="text"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder={t.genrePlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t.posterUrl}
          </label>
          <input
            type="url"
            name="posterUrl"
            value={formData.posterUrl}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder={t.posterUrlPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t.synopsis}
          </label>
          <textarea
            name="synopsis"
            value={formData.synopsis}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder={t.synopsisPlaceholder}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 px-4 rounded-md transition-colors duration-200"
        >
          {t.addButton}
        </button>
      </form>
    </div>
  );
}
