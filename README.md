# Rate My Rez | Waterloo Edition

The ultimate student-powered housing database for the University of Waterloo. Find honest reviews, compare prices, and discover the best (and worst) places to live—both on and off campus.

## 🚀 Features

* **Real-Time Reviews:** See what students are saying right now.
* **Community Q&A:** Ask questions about specific buildings and get answers from residents.
* **Smart Sorting:** Filter by Rent, Location, and "Most Helpful" reviews.
* **Amenity Tags:** Quickly see if a place has AC, Ensuite Bathrooms, or Pest Issues.
* **Map Integration:** One-click Google Maps view for every property.

## 🛠️ Tech Stack

* **Frontend:** React (Vite) + Tailwind CSS
* **Backend:** Firebase (Firestore & Authentication)
* **Icons:** Lucide React

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/draggle/Rate-My-Rez-Waterloo.git](https://github.com/draggle/Rate-My-Rez-Waterloo.git)
    cd Rate-My-Rez-Waterloo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add your Firebase keys:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
    ```

4.  **Run the app:**
    ```bash
    npm run dev
    ```

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

[MIT](https://choosealicense.com/licenses/mit/)