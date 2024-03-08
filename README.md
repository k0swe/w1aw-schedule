#  <img src="https://github.com/k0swe/w1aw-schedule/raw/main/web/src/assets/ARRL_colorado.svg" width="100px" alt="ARRL Colorado logo"> W1AW/0 Colorado Scheduler

In September 13-19, 2023, the Colorado section of the ARRL is going to be operating as W1AW/0 as part of
the Volunteers On The Air event! We need a way of scheduling operators to cover shifts.

![Screenshot of W1AW/0 Colorado Scheduler](w1aw-schedule.png)

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will
automatically reload if you change any of the source files.

## Firebase

This project uses several Firebase products (free tier) to handle functionality. It uses Firebase Authentication,
Firestore and the Firebase extension firebase/firestore-send-email.
(I happened to use SendGrid as an SMTP provider, also free tier). Those wishing to run their own instance and/or
develop new features will need to configure their own Firebase project, SMTP providers, and API keys.
