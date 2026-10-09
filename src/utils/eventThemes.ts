// Curated high-resolution thematic images matching university event types
export function getEventThemeImage(name: string, description: string = ''): string {
  const combined = (name + ' ' + description).toLowerCase();

  // 1. Dandiya / Garba / Raas / Navratri
  if (
    combined.includes('dandiya') ||
    combined.includes('garba') ||
    combined.includes('raas') ||
    combined.includes('navratri')
  ) {
    return 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80'; // Festive Indian dance/celebration
  }

  // 2. Music / Concert / Band / DJ / Singing
  if (
    combined.includes('music') ||
    combined.includes('concert') ||
    combined.includes('band') ||
    combined.includes('dj') ||
    combined.includes('acoustic') ||
    combined.includes('sing') ||
    combined.includes('rock') ||
    combined.includes('symphony')
  ) {
    return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80'; // Vibrant concert stage
  }

  // 3. Cultural / Fest / Annual / Festival / Dance / Drama
  if (
    combined.includes('cultural') ||
    combined.includes('fest') ||
    combined.includes('festival') ||
    combined.includes('diwali') ||
    combined.includes('holi') ||
    combined.includes('drama') ||
    combined.includes('theatre') ||
    combined.includes('dance')
  ) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80'; // Celebration lights & festival
  }

  // 4. Sports / Athletics / Tournament / Cricket / Football / Basketball / Badminton
  if (
    combined.includes('sport') ||
    combined.includes('athletic') ||
    combined.includes('tournament') ||
    combined.includes('cricket') ||
    combined.includes('football') ||
    combined.includes('soccer') ||
    combined.includes('basketball') ||
    combined.includes('badminton') ||
    combined.includes('marathon')
  ) {
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80'; // Running track / stadium sports
  }

  // 5. AI / Machine Learning / Tech / Coding / Hackathon / Robotics / Cyber
  if (
    combined.includes('ai') ||
    combined.includes('artificial intelligence') ||
    combined.includes('machine learning') ||
    combined.includes('deep learning') ||
    combined.includes('coding') ||
    combined.includes('hackathon') ||
    combined.includes('robot') ||
    combined.includes('cyber') ||
    combined.includes('tech') ||
    combined.includes('software') ||
    combined.includes('cloud') ||
    combined.includes('devops')
  ) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80'; // Futuristic tech matrix / code
  }

  // 6. Business / Analytics / Finance / Entrepreneurship / Marketing / Startup
  if (
    combined.includes('business') ||
    combined.includes('analytics') ||
    combined.includes('finance') ||
    combined.includes('entrepreneur') ||
    combined.includes('startup') ||
    combined.includes('marketing') ||
    combined.includes('management')
  ) {
    return 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80'; // Modern business analytics / conference
  }

  // 7. Workshop / Seminar / Lecture / Masterclass / Symposium
  if (
    combined.includes('workshop') ||
    combined.includes('seminar') ||
    combined.includes('masterclass') ||
    combined.includes('symposium') ||
    combined.includes('lecture') ||
    combined.includes('training')
  ) {
    return 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=900&q=80'; // Professional university workshop hall
  }

  // Fallback: Campus University Auditorium
  return 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80';
}
