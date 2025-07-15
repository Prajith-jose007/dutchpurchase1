
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

To run this project on your local machine, follow these steps:

### Prerequisites

*   **Node.js**: Make sure you have Node.js (version 18 or later) installed. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm**: This project uses `npm` as the package manager, which comes with Node.js.
*   **MySQL**: This project requires a running MySQL database server.

### 1. Install Dependencies

Once you have the code on your local machine, navigate to the project directory in your terminal and install the required packages:

```bash
npm install
```

### 2. Set Up Environment Variables

The project uses a `.env` file for environment variables. Create a file named `.env` in the root of your project and add your MySQL database connection details.

**Example `.env` file:**
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_DATABASE=dutchpurchase
```
Replace the values with your actual database credentials.

### 3. Set Up the Database

With your environment variables configured, you need to create the database tables and populate them with initial data. Run the following commands in order:

First, set up the database schema (this creates the tables):
```bash
npm run db:setup
```

Next, migrate the initial user data into the `users` table:
```bash
npm run migrate:data
```

### 4. Run the Development Server

To start the Next.js development server, run the following command:

```bash
npm run dev
```

This will start the application, typically on `http://localhost:9002`. You can open this URL in your browser to see the running application. The application will automatically reload if you make any changes to the code.
