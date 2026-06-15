import MainLayout from '@/components/layout/MainLayout';

export const metadata = {
  title: 'HK Family Fun - Discover Family Activities in Hong Kong',
  description: 'Find the best family-friendly activities, events, and experiences for kids in Hong Kong.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
