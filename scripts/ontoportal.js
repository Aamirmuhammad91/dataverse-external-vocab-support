/* http://www.apache.org/licenses/LICENSE-2.0
 * Controlled vocabulary for keywords metadata with Agroportal ontologies
 * version 0.2
 */

jQuery(document).ready(function ($) {
  const translations = {
    en: {
      selectTitle: 'Open in new tab to view Term page',
      selectTerm: 'Select a term',
      searchBy: 'Search by preferred or alternate label...',
    },
    fr: {
      selectTitle: 'Ouvre la page du mot-clé dans un nouvel onglet',
      selectTerm: 'Tapez le mot-clé',
      searchBy: 'Recherchez par mot-clé exact ou synonyme',
    },
  };
  const language = document.getElementsByTagName('html')[0].getAttribute('lang') === 'en' ? 'en' : 'fr'; // Guaranteed French language by default

  const displaySelector = "span[data-cvoc-protocol='ontoportal']";
  const inputSelector = "input[data-cvoc-protocol='ontoportal']";
  const cacheOntologies = 'ontoportal-ontologies';
  const showChildsInputs = false; // true to debug
  const emptyOption = '<option></option>'; // This empty option is really important for select2 to work well with a created tag and select event triggered

  expand();
  // In metadata edition, verify if Ontoportal is up to print select HTML tag + load ontologies
  if ($(inputSelector).length) {
    let cvocUrl = $(inputSelector).first().data('cvoc-service-url').trim();
    let cvocHeaders = $(inputSelector).first().data('cvoc-headers');
    cvocHeaders['Accept'] = 'application/json';
    if (cvocUrl && cvocUrl.search(/http[s]?:\/\//) == 0) {
      $.ajax({
        type: 'GET',
        url: `${cvocUrl}/ontologies?display_context=false&display_links=false&display=acronym,name`,
        dataType: 'json',
        headers: cvocHeaders,
        timeout: 3500,
        success: function (ontologies, textStatus, jqXHR) {
          sessionStorage.setItem(cacheOntologies, JSON.stringify(ontologies));
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error(`${textStatus}: ${errorThrown}`);
        },
      }).done(function () {
        updateInputs();
      });
    }
  }

  function getLocalizedText(key) {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    } else {
      // Return the key itself if the translation is not found
      return key;
    }
  }

  function findVocNameAndAcronymById(id) {
    let ontologies = JSON.parse(sessionStorage.getItem(cacheOntologies));
    let ontology = ontologies.find((item) => item['@id'] === id);
    if (ontology) {
      return `${ontology.name} (${ontology.acronym})`;
    }
    return id.substring(id.lastIndexOf('/') + 1);
  }

  function findVocAcronymById(id) {
    let ontologies = JSON.parse(sessionStorage.getItem(cacheOntologies));
    let ontology = ontologies.find((item) => item['@id'] === id);
    if (ontology) {
      return ontology.acronym;
    }
    return id.substring(id.lastIndexOf('/') + 1);
  }

  function findVocNameByAcronym(acronym) {
    let ontologies = JSON.parse(sessionStorage.getItem(cacheOntologies));
    let ontology = ontologies.find((item) => item['acronym'] === acronym);
    if (ontology) {
      return ontology.name;
    }
    return acronym;
  }

  function expand() {
    // Check each selected element
    $(displaySelector).each(function () {
      let displayElement = this;
      // If it hasn't already been processed
      if (!$(displayElement).hasClass('expanded')) {
        let parent = $(displayElement).parent();
        // Mark it as processed
        $(displayElement).addClass('expanded');
        // The service URL to contact using this protocol
        let cvocUrl = $(displayElement).data('cvoc-service-url');
        // The cvoc managed fields
        let managedFields = $(displayElement).data('cvoc-managedfields');
        let index = $(displayElement).data('cvoc-index');
        // The value in the element. Currently, this must be either the URI of a term or plain text - with the latter not being formatted at all by this script
        let id = displayElement.textContent;
        // Assume anything starting with http is a valid term - could use stricter tests
        if (id.startsWith('http')) {
          let ontology = parent.find(`[data-cvoc-metadata-name="${managedFields.vocabularyName}"][data-cvoc-index="${index}"]`).text();
          let termName = parent.find(`[data-cvoc-metadata-name="${managedFields.termName}"][data-cvoc-index="${index}"]`).text();
          let url = cvocUrl.replace('data.', '') + 'ontologies/' + ontology + '?p=classes&conceptid=' + encodeURIComponent(id);
          if (parent.is('a')) {
            // Display only the term if it is already into a link
            $(displayElement).text(termName);
          } else {
            // Display the term with a link to agroportal
            let a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('title', url);
            a.setAttribute('target', '_black');
            a.setAttribute('rel', 'noopener');
            a.appendChild(document.createTextNode(termName));
            // Clear the term URI
            $(displayElement).empty();
            // Display the link
            displayElement.append(a);
          }
        } else {
          // Don't change the display if it wasn't a controlled term
        }
      }
    });

    //Special case allow-free-text is true + typed value is mapped to termValue instead of termUri
    $("span[data-cvoc-metadata-name='keywordValue'][data-cvoc-index]").each(function () {
      if ($(`span[data-cvoc-protocol='ontoportal'][data-cvoc-index="${$(this).attr('data-cvoc-index')}"]`).length == 0) {
        $(this).removeClass('hidden').removeAttr('hidden');
      }
    });
  }

  function updateInputs() {
    // For each input element
    $(inputSelector).each(function () {
      let input = this;
      // If we haven't modified this input yet
      if (!input.hasAttribute('data-ontoportal')) {
        // Create a random identifier (large enough to minimize the possibility of conflicts for a few fields
        // Use let to have 'closure' - so that when num is used below it always refers to the same value set here (and not the last value num is set to if/when there are multiple fields being managed)
        let num = Math.floor(Math.random() * 100000000000);
        // Retrieve useful values from the attributes
        let cvocUrl = $(input).data('cvoc-service-url');
        let cvocHeaders = $(input).data('cvoc-headers');
        cvocHeaders['Accept'] = 'application/json';
        let vocabs = $(input).data('cvoc-vocabs');
        let managedFields = $(input).data('cvoc-managedfields');
        let allowFreeText = $(input).data('cvoc-allowfreetext');
        let parentField = $(input).data('cvoc-parent');
        let parentFieldDataSelector = `[data-cvoc-parentfield="${parentField}"]`;
        let vocabNameSelector = `input[data-cvoc-managed-field="${managedFields['vocabularyName']}"]`;
        let vocabUriSelector = `input[data-cvoc-managed-field="${managedFields['vocabularyUri']}"]`;
        let termSelector = `input[data-cvoc-managed-field="${managedFields['termName']}"]`;

        let placeholder = input.hasAttribute('data-cvoc-placeholder') ? $(input).attr('data-cvoc-placeholder') : getLocalizedText('selectTerm');
        // TODO : use in future ?
        let lang = input.hasAttribute('lang') ? $(input).attr('lang') : '';
        let langParam = input.hasAttribute('lang') ? '&lang=' + $(input).attr('lang') : '';
        let termParentUri = $(input).data('cvoc-filter');
        // <select> identifier
        let selectId = 'ontoportalAddSelect_' + num;
        // Pick the first entry as the default to start with when there is more than one vocab
        // let vocab = Object.keys(vocabs)[0];

        // Mark this field as processed
        $(input).attr('data-ontoportal', num);
        // Decide what needs to be hidden. In the single field case, we hide the input itself. For compound fields, we hide everything leading to this input from the specified parent field
        let anchorSib = input;
        // If there is a parent field
        if ($(parentFieldDataSelector).length > 0) {
          // Find it's child that contains the input for the term uri
          anchorSib = $(input).parentsUntil(parentFieldDataSelector).last();
        }
        // Then hide all children of this element's parent.
        // For a single field, this just hides the input itself (and any siblings if there are any).
        // For a compound field, this hides other fields that may store term name/ vocab name/uri ,etc. ToDo: only hide children that are marked as managedFields?

        $(anchorSib).parent().children().toggle(showChildsInputs);
        //Vocab Selector
        //Currently the code creates a selection form even if there is one vocabulary, and then hides it in that case. (ToDo: only create it if needed)
        //We create a unique id to be able to find this particular input again

        $(anchorSib).after(`<select id=${selectId} class="form-control add-resource select2" tabindex="-1" aria-hidden="true">${emptyOption}</select>`);
        // Set up this select2
        $(`#${selectId}`).select2({
          theme: 'classic',
          // tags true allows a free text entry (not a term uri, just plain text): ToDo - make this configurable
          tags: allowFreeText,
          createTag: function (params) {
            var term = $.trim(params.term);
            if (term === '') {
              return null;
            }
            return {
              id: term,
              text: term,
              newTag: true,
            };
          },
          templateResult: function (item) {
            // No need to template the searching text
            if (item.loading) {
              return item.text;
            }
            let term = '';
            if (typeof query !== 'undefined') {
              term = query.term;
            }
            // markMatch bolds the search term if/where it appears in the result
            let $result = markMatch(item.text, term);
            return $result;
          },
          templateSelection: function (item) {
            // For a selection, add HTML to make the term uri a link
            if (item.uiUrl) {
              return $('<span></span>').append(`<a href="${item.uiUrl}" target="_blank" rel="noopener">${item.text}</a>`);
            }
            // new Option() cases contains url but in item.text
            //TODO: add findVocNameAndAcronymById
            let pos = item.text.search(/http[s]?:\/\//);
            if (pos >= 0) {
              let termUri = item.text.substr(pos);
              let term = item.text.substr(0, pos);
              return $('<span></span>').append(`<a href="${termUri}" target="_blank" rel="noopener">${term}</a>`);
            }
            return item.text;
          },
          language: {
            searching: function (params) {
              // Change this to be appropriate for your application
              return getLocalizedText('searchBy');
            },
          },
          placeholder: placeholder,
          // Some vocabs are very slow and/or fail with a 500 error when searching for only 2 letters
          minimumInputLength: 3,
          allowClear: true,
          ajax: {
            // Call the specified ontoportal service to get matching terms
            // Add the current vocab, any sub-vocabulary(termParentUri) filter, and desired language
            url: function () {
              let vocabsArr = [];
              for (let key in vocabs) {
                vocabsArr.push(key);
              }
              return `${cvocUrl}/search?include_properties=true&pagesize=10&include_views=true&display_context=false&ontologies=${vocabsArr.join(',')}`;
            },
            dataType: 'json',
            headers: cvocHeaders,
            data: function (params) {
              // Add the query
              return `q=${params.term}`;
            },
            delay: 500,
            processResults: function (data, page) {
              // console.log("data", data);
              return {
                results: data.collection.map(function (x) {
                  return {
                    // For each returned item, show the term, it's alternative label (which may be what matches the query) and the termUri
                    // text: x.prefLabel + ((x.hasOwnProperty('altLabel') && x.altLabel.length > 0) ? " (" + x.altLabel + "), " : ", ") + x.uri,
                    //FIXME : Temporary fix on prefLabel, pick only the first until language is fixed on /search API
                    text: `${x.prefLabel[0]} - ${findVocNameAndAcronymById(x.links.ontology)}`,
                    name: x.prefLabel[0],
                    id: x['@id'],
                    voc: x.links.ontology,
                    uiUrl: x.links.ui,
                    // Using title to provide that hint as a popup
                    title: getLocalizedText('selectTitle'),
                  };
                }),
              };
            },
            error: function (jqXHR, textStatus, errorThrown) {
              console.error(`${textStatus}: ${errorThrown}`);
            },
          },
        });
        // If the input has a value already, format it the same way as if it were a new selection.
        let id = $(input).val();
        let ontology = $(anchorSib).parent().children().find(vocabNameSelector).val();
        let termName = $(anchorSib).parent().children().find(termSelector).val();
        let newOption;
        if (id) {
          newOption = new Option(
            `${termName} - ${findVocNameByAcronym(ontology)} (${ontology})${cvocUrl.replace('data.', '')}ontologies/${ontology}?p=classes&conceptid=${encodeURIComponent(id)}`,
            id,
            true,
            true
          );
        } else if (termName) {
          newOption = new Option(termName, termName, true, true);
        }

        $(`#${selectId}`).append(newOption).trigger('change');
        // Could start with the selection menu open
        // $(`#${selectId}`).select2('open');
        // When a selection is made, set the value of the hidden input field
        $(`#${selectId}`).on('select2:select', function (e) {
          let data = e.params.data;

          if ($(parentFieldDataSelector).length > 0) {
            let parent = $(`input[data-ontoportal="${num}"]`).closest(parentFieldDataSelector);

            if (data.newTag) {
              // newTag attribute is defined while using free text
              $(parent)
                .children()
                .each(function () {
                  $(this).find('input').attr('value', '');
                });
              $(parent).find(termSelector).attr('value', data.id);
            } else {
              $(`input[data-ontoportal="${num}"]`).val(data.id);
              for (let key in managedFields) {
                if (key == 'vocabularyName') {
                  $(parent).find(vocabNameSelector).attr('value', findVocAcronymById(data.voc));
                } else if (key == 'vocabularyUri') {
                  // Get the vocabulary URI from Ontoportal with "/latest_submission" API endpoint
                  console.log('data.voc ----------- ' + data);
                  let uri = data.voc.replace('data.', '');
                  $.ajax({
                    type: 'GET',
                    url: `${data.voc}/latest_submission?display=URI`,
                    dataType: 'json',
                    headers: cvocHeaders,
                    success: function (ontology, textStatus, jqXHR) {
                      if (ontology.URI) {
                        uri = ontology.URI;
                      }
                      $(parent).find(vocabUriSelector).attr('value', uri);
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                      console.error(`${textStatus}: ${errorThrown}`);
                      $(parent).find(vocabUriSelector).attr('value', uri);
                    },
                  });
                } else if (key == 'termName') {
                  $(parent).find(termSelector).attr('value', data.name);
                }
              }
            }
          }
        });
        // When a selection is cleared, clear the hidden input
        $(`#${selectId}`).on('select2:clear', function (e) {
          $(`#${selectId}`).html(emptyOption);
          $(`#${selectId}`).val(null).trigger('change');
          if ($(parentFieldDataSelector).length > 0) {
            var parent = $(`input[data-ontoportal="${num}"]`).closest(parentFieldDataSelector);
            $(parent)
              .children()
              .each(function () {
                $(this).find('input').attr('value', '');
              });
          }
        });
      }
    });
  }

  // Put the text in a result that matches the term in a span with class
  // select2-rendered__match that can be styled (e.g. bold)
  function markMatch(text, term) {
    // Find where the match is
    var match = text.toUpperCase().indexOf(term.toUpperCase());
    var $result = $('<span></span>');
    // If there is no match, move on
    if (match < 0) {
      return $result.text(text);
    }

    // Put in whatever text is before the match
    $result.text(text.substring(0, match));

    // Mark the match
    var $match = $('<span class="select2-rendered__match"></span>');
    $match.text(text.substring(match, match + term.length));

    // Append the matching text
    $result.append($match);

    // Put in whatever is after the match
    $result.append(text.substring(match + term.length));

    return $result;
  }
});
