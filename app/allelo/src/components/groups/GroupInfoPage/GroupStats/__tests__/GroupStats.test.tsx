import { render, screen } from '@testing-library/react';
import { GroupStats } from '../GroupStats';
import type { Group } from '@/types/group';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockGroup: Group = {
  id: 'test-group',
  name: 'Test Group',
  description: 'A test group for unit tests',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  memberCount: 5,
  memberIds: ['user1', 'user2', 'user3'],
  createdBy: 'test-user',
  isPrivate: false,
  tags: ['test', 'development', 'unit-tests'],
  image: '/test-image.jpg'
};

const defaultProps = {
  group: mockGroup,
  memberCount: 5,
};

describe('GroupStats', () => {
  it('renders without crashing', () => {
    const { container } = render(<GroupStats {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<GroupStats {...defaultProps} />);
    if (mockGroup.description) {
      expect(screen.getByText(mockGroup.description)).toBeInTheDocument();
    }
  });

  it('renders tags when provided', () => {
    render(<GroupStats {...defaultProps} />);
    if (mockGroup.tags) {
      for (const tag of mockGroup.tags) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }
    }
  });

  it('handles missing tags gracefully', () => {
    const groupWithoutTags = { ...mockGroup, tags: undefined };
    const { container } = render(<GroupStats group={groupWithoutTags} memberCount={5} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles empty tags array', () => {
    const groupWithEmptyTags = { ...mockGroup, tags: [] };
    const { container } = render(<GroupStats group={groupWithEmptyTags} memberCount={5} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});