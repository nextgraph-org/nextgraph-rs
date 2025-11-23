export const formatDate = (date: Date | string, options?: Partial<Intl.DateTimeFormatOptions>): string => {
  const formattedDate = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  try {
    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      ...options
    }).format(formattedDate);
  } catch (error) {
    console.log(error);
    return "Unknown date";
  }
};

export const formatDateDiff = (date: Date, inDays?: boolean) => {
  const now = new Date();
  if (inDays) {
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
  } else {
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return diffInHours <= 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
  }

  return date.toLocaleDateString();
};