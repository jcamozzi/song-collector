var express = require('express');
var router = express.Router();
var pg = require('pg');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var emailMessage = require('./email-message');
var gmailpass = require('./gmailpass');

var pool = require('../modules/pg-pool');


// start nodemailer-smtp-transport
var transporter = nodemailer.createTransport(smtpTransport({
  service: 'Gmail',
  auth: {
    user: 'isongcollect@gmail.com',
    pass: gmailpass().password
  }
}));

transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
// end nodemailer-smtp-transport

router.get('/', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('SELECT id, song_title_text, tone_set_note, scale_mode_text, teachable_elements_text, rhythm_note, extractable_rhythms_note, extractable_melodies_note, meter_text, verses_note, formation_note, action_note, intervals_note_groups_text, phrases_text, melodic_form_text, rhythmic_form_text, form_type_text, song_type_text, culture_origin_text, language_text, csp_text, other_note, source_note, user_id FROM song_collection WHERE user_id=$1;', [userId], function(err, result) {
      done();
      if(err) {
        console.log('error making database query: ', err);
        res.sendStatus(500);
      } else {
        // if(result.rows > 0) {
        //   //
        // }
        res.send(result.rows);
      }
      }); // end client.query
    }
  }); // end pool.connect
}); //end router.get

// post uploaded file to database
router.post('/addImage/:id', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  var imageObject = req.body;
  var songId = req.params.id;
  console.log('imageObject: ', imageObject);
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('WITH new_image_id AS (INSERT INTO images (image_file_name, image_type, image_size, image_url, image_handle) VALUES ($1, $2, $3, $4, $5) RETURNING id) INSERT INTO images_users (image_id, user_id) VALUES ((SELECT id FROM new_image_id), $6);', [imageObject[0].filename, imageObject[0].mimetype, imageObject[0].size, imageObject[0].url, imageObject[0].handle, userId], function(err, result) {
        done();
        if(err) {
          console.log('error making database query: ', err);
          res.sendStatus(500);
        } else {
          client.query('SELECT id FROM images WHERE image_url = $1;', [imageObject[0].url], function(err, result) {
            if(err) {
              console.log('error making database query: ', err);
              res.sendStatus(500);
            } else {
              var imageId = result.rows[0].id;
              console.log('image id from select', imageId);
              client.query('INSERT INTO images_songs (image_id, song_id) VALUES ($1, $2);', [imageId, songId], function(err, result) {
                if(err) {
                  console.log('error making database query: ', err);
                  res.sendStatus(500);
                } else {
                  res.sendStatus(200);
                }
              }); // end client.query
            }
          }); // end client.query
        }
      }); // end client.query
    }
  }); // end pool.connect
}); //end router.post

// get attachments from db and add to dom
router.get('/getAttachments/:id', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  var songId = req.params.id;
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('SELECT * FROM images LEFT JOIN images_songs ON images_songs.image_id = images.id WHERE song_id = $1;', [songId], function(err, result) {
        done();
        if(err) {
          console.log('error making database query: ', err);
          res.sendStatus(404);
        } else {
          res.send(result.rows);
        }
      }); // end client.query
    }
  }); // end pool.connect
}); //end router.get

// get single song from db for view
router.get('/singleSong/:id', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  var songId = req.params.id;
  console.log('songId', songId);
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('SELECT id, song_title_text, tone_set_note, scale_mode_text, teachable_elements_text, rhythm_note, extractable_rhythms_note, extractable_melodies_note, meter_text, verses_note, formation_note, action_note, intervals_note_groups_text, phrases_text, melodic_form_text, rhythmic_form_text, form_type_text, song_type_text, culture_origin_text, language_text, csp_text, other_note, source_note, user_id FROM song_collection WHERE id = $1;', [songId], function(err, result) {
        done();
        if(err) {
          console.log('error making database query: ', err);
          res.sendStatus(500);
        } else {
          console.log('result.rows', result.rows[0]);
          res.send(result.rows[0]);
        }
      }); // end client.query
    }
  }); // end pool.connect
}); //end router.get

router.post('/newSong', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  var songObject = req.body;
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('INSERT INTO song_collection (song_title_text, tone_set_note, scale_mode_text, teachable_elements_text, rhythm_note, extractable_rhythms_note, extractable_melodies_note, meter_text, verses_note, formation_note, action_note, intervals_note_groups_text, phrases_text, melodic_form_text, rhythmic_form_text, form_type_text, song_type_text, culture_origin_text, language_text, csp_text, other_note, source_note, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);', [songObject.title, songObject.toneSet, songObject.scaleMode.scale_mode, songObject.teachableElements.teachable_elements, songObject.rhythm, songObject.extractableRhythms, songObject.extractableMelodies, songObject.meter.meter, songObject.verses, songObject.formation, songObject.action, songObject.intervalsNoteGroups, songObject.phrases, songObject.melodicForm, songObject.rhythmicForm, songObject.formType.form_type, songObject.songType.song_type, songObject.cultureOrigin, songObject.language.language, songObject.csp, songObject.other, songObject.source, userId], function(err, result) {
        done();
        if(err) {
          console.log('error making database query: ', err);
          res.sendStatus(500);
        } else {
          console.log('result.rows', result.rows[0]);
          res.send(result.rows[0]);
        }
      }); // end client.query
    }
  }); // end pool.connect
}); //end router.get

router.delete('/removeSong/:id', function(req, res) {
  var userId = req.userInfo[0].id; // will become user id pulled from decoder token
  var songId = req.params.id;
  pool.connect(function(err, client, done) {
    if(err) {
      console.log('error connecting to the database: ', err);
      res.sendStatus(500);
    } else {
      client.query('DELETE FROM song_collection WHERE id = $1 AND user_id = $2;', [songId, userId], function(err, result) {
        done();
        if(err) {
          console.log('error making database query: ', err);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      }); // end client.query
    }
  }); // end pool.connect
}); // end router.delete
module.exports = router;
