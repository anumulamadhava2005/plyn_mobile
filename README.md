# Plyn Project

## Overview
Plyn is a React Native application designed for booking salon services. It allows users to view salon details, select services, choose available time slots, and make bookings seamlessly.

## Project Structure
The project is organized into several directories and files:

- **comps/**: Contains all the components used in the application.
  - **Calendar/**: Contains the Calendar component for date selection.
    - `Calendar.tsx`: The main component file for the calendar interface.
    - `Calendar.module.css`: Styles specific to the Calendar component.
  - `SalonDetailsScreen.tsx`: Displays details about a salon, including services and available time slots.

- **integrations/**: Contains integration files for external services.
  - **supabase/**: Contains the Supabase client for database interactions.
    - `client.ts`: Initializes and exports the Supabase client.

- **lib/**: Contains utility functions.
  - `date-utils.ts`: Utility functions for date formatting and manipulation.

- `App.tsx`: The main entry point of the application, setting up routing and global state management.

- `package.json`: Configuration file for npm, listing dependencies and scripts.

- `tsconfig.json`: TypeScript configuration file specifying compiler options.

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd plyn
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the application:
   ```
   npm start
   ```

## Usage
- Open the application on your device or emulator.
- Browse through the salons, select a service, choose a date using the calendar, and book your appointment.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.