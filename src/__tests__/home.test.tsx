import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from '../app/page'

// Mock components that might cause issues in test environment
jest.mock('@/components/ui/calendar', () => ({
    Calendar: () => <div data-testid="calendar">Calendar</div>
}))

jest.mock('@/components/CabinGrid', () => {
    return function start() {
        return <div data-testid="cabin-grid">Cabin Grid</div>
    }
})

describe('Home', () => {
    it('renders the main heading', () => {
        render(<Home />)

        const heading = screen.getByRole('heading', { level: 1 })

        expect(heading).toBeInTheDocument()
        expect(heading).toHaveTextContent('Cabinas Biblioteca UJI')
    })

    it('renders the sidebar and main content', () => {
        render(<Home />)

        expect(screen.getByTestId('calendar')).toBeInTheDocument()
        expect(screen.getByTestId('cabin-grid')).toBeInTheDocument()
    })
})
