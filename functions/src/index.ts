import * as functions from "firebase-functions";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

import { FieldPath, WhereFilterOp } from "@google-cloud/firestore";

import admin = require("firebase-admin");
// import { tryGetAllKeys } from "./cool-fns";
// eslint-disable-next-line max-len
// import { serviceAccount } from "./tcomfybike-firebase-adminsdk-g1r6b-c21fc8dd72";

interface ISweetFirebaseError {
  errorInfo: {
    message: string;
    code: string;
  };
}

interface IHttpsErrorDetails {
  message: string;
  code: string;
}

interface IUserRoles {
  admin: boolean;
  user: boolean;
}

interface IFirestoreTimeStamp {
  nanoseconds: number;
  seconds: number;
}

interface IFirestoreGeoPoint {
  latitude: number;
  longitude: number;
}

type tyFirestoreDocField =
  | null
  | boolean
  | string
  | number
  | IFirestoreTimeStamp
  | IFirestoreGeoPoint
  // as only for input to db [start]
  // | FieldValue // for serverTimestamp()
  // as only for input to db [end]
  | tyFirestoreDocField[]
  | { [key: string]: tyFirestoreDocField };

export interface ISimpleDoc_withId {
  [key: string]: tyFirestoreDocField;
  id: string;
}

export type tySimpleDoc_withoutId = {
  [key: string]: tyFirestoreDocField;
} & {
  id?: never;
};

admin
  .initializeApp
  //   {
  //   credential: admin.credential.cert({
  //     clientEmail: serviceAccount.client_email,
  //     privateKey: serviceAccount.private_key,
  //     projectId: serviceAccount.project_id,
  //   }),
  // }
  ();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");

  // new Promise((res, req) => {
  //   res(0);
  // }).then((x) => {
  //   new Promise((resolve, reject) => {
  //     resolve(0);
  //   }).then((x) => {
  //     //
  //   });
  // });
});

const firebaseDocIntoSimpleDoc = (
  rawDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>,
) => {
  if (rawDoc.exists) {
    const simpleData_withoutId: tySimpleDoc_withoutId = rawDoc.data();

    const simpleData_withId: ISimpleDoc_withId = {
      ...simpleData_withoutId,
      id: rawDoc.id,
    };

    return simpleData_withId;
  } else {
    return null;
  }
};

export const firebaseAdmin_getCollection_byQuery = async ({
  collectionId,
  whereQueryArr,
}: {
  collectionId: string;
  whereQueryArr: [string | FieldPath, WhereFilterOp, tyFirestoreDocField][]; // [`members.${uid}.active`, "==", "sdfsdf"]
}) => {
  const colRef = admin.firestore().collectionGroup(collectionId);

  const len = whereQueryArr.length;

  let whereRef:
    | admin.firestore.CollectionGroup<admin.firestore.DocumentData>
    | admin.firestore.Query<admin.firestore.DocumentData> = colRef;

  for (let i = 0; i < len; i += 1) {
    whereRef = whereRef.where(...whereQueryArr[i]);
  }

  const fDocs = await whereRef.get();

  const myDocs = fDocs.docs.map((doc) => {
    const simpleDoc = firebaseDocIntoSimpleDoc(doc);
    return simpleDoc;
  });

  return myDocs;
};

export const deleteOneUser = functions.https.onCall(
  async (data: { userId: string }, context) => {
    const userId = data.userId;
    console.log(typeof context);

    const gotError = { v: false };

    try {
      // first in Auth:
      await admin.auth().deleteUser(userId);
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;
      // console.log(err);
      gotError.v = true;
      throw new functions.https.HttpsError("unknown", err.errorInfo.message, {
        message: myError.errorInfo.message,
        code: myError.errorInfo.code,
      } as IHttpsErrorDetails);
    }

    if (gotError.v) {
      return null;
    }

    try {
      // second in Firestore database:
      await admin.firestore().doc(`/users/${userId}`).delete();

      // await admin.auth().createUser({email: "koka@mymail.com", password: undefined});

      // const specificBikesForRatingsByThisUser =
      //   await firebaseAdmin_getCollection_byQuery({
      //     collectionId: "bikes",
      //     whereQueryArr: [[`active`, "==", userId]],
      //   });

      // TODO: delete the user data in ratings and rental days
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;
      // console.log(err);
      gotError.v = true;
      throw new functions.https.HttpsError(
        "unknown",
        myError.errorInfo.message,
        {
          message: myError.errorInfo.message,
          code: myError.errorInfo.code,
        } as IHttpsErrorDetails,
      );
    }

    if (gotError.v) {
      return null;
    }

    return userId;
  },
);

export const updateOneUser = functions.https.onCall(
  async (
    data: {
      userId: string;
      password?: string;

      info: {
        email?: string;
        firstName?: string;
        lastName?: string;
        roles?: IUserRoles;
      };
    },
    context,
  ) => {
    const actorId: string | null = context.auth?.uid || null;
    const idOfUserToUpdate = data.userId;
    // const forMyself = actorId === idOfUserToUpdate;
    console.log(typeof context);

    const gotError: { v: any } = { v: false };

    try {
      // first in Auth:

      // if (forMyself) {
      //   const credential = admin.auth.EmailAuthProvider.credential(
      //     firebase.auth().currentUser.email,
      //     providedPassword
      //   );
      // }

      // if (data.info.email) {
      //   const thisEmailInDb = await firebaseAdmin_getCollection_byQuery({
      //     collectionId: "users",
      //     whereQueryArr: [[`email`, "==", data.info.email]],
      //   });

      //   if (thisEmailInDb.length > 0) {
      //     // throw new Error("This email is not available");
      //     return "emailNotAvailable";
      //   }
      // }

      const theOb = {
        email: data.info.email,
        password: data.password,
      };

      // remove all properties with undefined value !!!!!!!!!!!!!!! otherwise backend will consider them as null values
      const theOb2 = JSON.parse(JSON.stringify(theOb));

      if (data.info.email || data.password) {
        await admin.auth().updateUser(data.userId, theOb2);
      }
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;

      // functions.logger.log(
      //   "dudube7:",
      //   Object.entries(err),
      //   "daaa:",
      //   tryGetAllKeys(err),
      // );

      // functions.logger.log("dudube7:", tryGetAllKeys(err));
      // console.log(err);
      gotError.v = { from1: err };

      throw new functions.https.HttpsError(
        "unknown",
        myError.errorInfo.message,
        {
          message: myError.errorInfo.message,
          code: myError.errorInfo.code,
        } as IHttpsErrorDetails,
      );
      // return;
    }

    if (gotError.v) {
      return gotError.v;
    }

    try {
      // second in Firestore database:

      const theOb = data.info;

      if (Object.values(theOb).some((x) => x !== undefined)) {
        // remove all properties with undefined value !!!!!!!!!!!!!!! otherwise backend will consider them as null values
        const theOb2 = JSON.parse(JSON.stringify(theOb));

        await admin
          .firestore()
          .doc(`/users/${idOfUserToUpdate}`)
          .update(theOb2);

        // await admin.auth().createUser({email: "koka@mymail.com", password: undefined});

        // const specificBikesForRatingsByThisUser =
        //   await firebaseAdmin_getCollection_byQuery({
        //     collectionId: "bikes",
        //     whereQueryArr: [[`active`, "==", userId]],
        //   });

        // TODO: delete the user data in ratings and rental days
      }
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;
      // console.log(err);
      gotError.v = { from2: err };
      // throw new Error(err.code);
      throw new functions.https.HttpsError(
        "unknown",
        myError.errorInfo.message,
        {
          message: myError.errorInfo.message,
          code: myError.errorInfo.code,
        } as IHttpsErrorDetails,
      );
    }

    if (gotError.v) {
      return gotError.v;
    }

    return {
      idOfUserToUpdate,
      actorId,
    };
  },
);

export const createOneUser = functions.https.onCall(
  async (
    data: {
      password: string;

      info: {
        email: string;
        created: number; // milliseconds from the ERA
        firstName: string;
        lastName: string;
        roles: IUserRoles;
      };
    },
    context,
  ) => {
    console.log(typeof context);

    const gotError = { v: false };
    const newUserIdObj = { v: "" };

    try {
      // first in Auth:

      const theOb = { email: data.info.email, password: data.password };

      // remove all properties with undefined value !!!!!!!!!!!!!!! otherwise backend will consider them as null values
      const theOb2 = JSON.parse(JSON.stringify(theOb));

      const newUserRec = await admin.auth().createUser(theOb2);

      newUserIdObj.v = newUserRec.uid;
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;
      // console.log(err);
      gotError.v = true;
      throw new functions.https.HttpsError(
        "unknown",
        myError.errorInfo.message,
        {
          code: myError.errorInfo.code,
          message: myError.errorInfo.message,
        } as IHttpsErrorDetails,
      );
    }

    if (gotError.v || !newUserIdObj.v) {
      return null;
    }

    try {
      // second in Firestore database:

      const theOb = data.info;

      // remove all properties with undefined value !!!!!!!!!!!!!!! otherwise backend will consider them as null values
      const theOb2 = JSON.parse(JSON.stringify(theOb));

      await admin.firestore().doc(`/users/${newUserIdObj.v}`).create(theOb2);
    } catch (err: any) {
      const myError = err as ISweetFirebaseError;
      // console.log(err);
      // functions.logger.error(">>>>>>>>", err, "<<<<<<<<<", {
      //   structuredData: true,
      // });
      gotError.v = true;
      throw new functions.https.HttpsError(
        "unknown",
        myError.errorInfo.message,
        {
          code: myError.errorInfo.code,
          message: myError.errorInfo.message,
        } as IHttpsErrorDetails,
      );
    }

    if (gotError.v) {
      return null;
    }

    return newUserIdObj.v;
  },
);
