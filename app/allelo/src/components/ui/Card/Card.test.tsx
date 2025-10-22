import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import { ThemeProvider, createTheme } from '@mui/material/styles';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Card', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <Card>
        <div>Card content</div>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    renderWithTheme(<Card ref={ref}>Test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('shows loading skeleton when loading prop is true', () => {
    renderWithTheme(<Card loading>Content</Card>);
    
    // Skeleton uses a span element, not progressbar role
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders content when not loading', () => {
    renderWithTheme(
      <Card loading={false}>
        <div>Actual content</div>
      </Card>
    );
    
    expect(screen.getByText('Actual content')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('applies hover styles when hover prop is true', () => {
    renderWithTheme(<Card hover>Hoverable card</Card>);
    
    const card = document.querySelector('.MuiCard-root') as HTMLElement;
    expect(card).toHaveStyle('transition: box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms');
  });

  it('does not apply hover styles when hover prop is false', () => {
    renderWithTheme(<Card hover={false}>Non-hoverable card</Card>);
    
    const card = document.querySelector('.MuiCard-root') as HTMLElement;
    expect(card).not.toHaveStyle('transition: box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms');
  });

  it('applies custom padding when padding prop is provided', () => {
    renderWithTheme(<Card padding={3}>Custom padding</Card>);
    
    const cardContent = document.querySelector('.MuiCardContent-root') as HTMLElement;
    expect(cardContent).toHaveStyle('padding: 24px 24px 24px 24px');
  });

  it('applies custom padding with string value', () => {
    renderWithTheme(<Card padding="16px">String padding</Card>);
    
    const cardContent = document.querySelector('.MuiCardContent-root') as HTMLElement;
    // MUI applies additional bottom padding by default
    expect(cardContent).toHaveStyle('padding-left: 16px');
    expect(cardContent).toHaveStyle('padding-right: 16px');
    expect(cardContent).toHaveStyle('padding-top: 16px');
  });

  it('applies custom sx prop correctly', () => {
    renderWithTheme(
      <Card sx={{ backgroundColor: 'red', border: '1px solid blue' }}>
        Styled card
      </Card>
    );
    
    const card = document.querySelector('.MuiCard-root') as HTMLElement;
    expect(card).toHaveStyle('background-color: red');
    expect(card).toHaveStyle('border: 1px solid blue');
  });

  it('combines hover styles with custom sx prop', () => {
    renderWithTheme(
      <Card hover sx={{ backgroundColor: 'red' }}>
        Combined styles
      </Card>
    );
    
    const card = document.querySelector('.MuiCard-root') as HTMLElement;
    expect(card).toHaveStyle('background-color: red');
    expect(card).toHaveStyle('transition: box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms');
  });

  it('passes through other MUI Card props', () => {
    renderWithTheme(<Card elevation={8}>Elevated card</Card>);
    
    const card = document.querySelector('.MuiCard-root') as HTMLElement;
    expect(card).toHaveClass('MuiPaper-elevation8');
  });

  it('renders with default props when no props provided', () => {
    renderWithTheme(<Card>Default card</Card>);
    
    expect(screen.getByText('Default card')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});