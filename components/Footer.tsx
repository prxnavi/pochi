export default function Footer() {
  return (
    <footer className="border-t-2 border-ink/10 mt-auto">
      <div className="max-w-5xl mx-auto px-5 py-6 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-ink-soft">
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSeT0owUd7poNJOeFGBqzImtgD2u3h13DyT4JwjOFZ797zTZDg/viewform?usp=publish-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-ink text-cream font-bold px-4 py-1.5 rounded-full hover:bg-box-pink-deep transition-colors"
        >
          send feedback
        </a>
        <a href="mailto:hi.pochiweb@gmail.com" className="hover:text-box-pink-deep transition-colors">
          hi.pochiweb@gmail.com
        </a>
      </div>
    </footer>
  );
}
