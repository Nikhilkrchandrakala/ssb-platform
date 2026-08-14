"use client";

import { useEffect, useRef } from "react";

// This is the client's exact Zoho Web-to-Contact embed ("Webform Booking"
// lead source), pasted verbatim except for CSS/color values (background,
// text/label colors, input backgrounds) so it's legible inside this app's
// dark modal — per the client's own instruction: "you can change the css
// only nothing else because if you do so zoho might not map the field."
// Field names, hidden inputs (xnQsjsdp/xmIwtLD/etc.), the form id, and every
// <script> block are byte-identical to what was supplied. Do not remove any
// of the "Do not remove this code" blocks below — Zoho's own comment, kept
// verbatim.
const ZOHO_FORM_HTML = `
<div id='crmWebToEntityForm' class='zcwf_lblLeft crmWebToEntityForm' style='background-color: transparent;color: #eae9d4;max-width: 100%;'>
	<meta name='viewport' content='width=device-width, initial-scale=1.0'>
	<META HTTP-EQUIV='content-type' CONTENT='text/html;charset=UTF-8'>
	<style>
		.wf_customMessageBox{
			font-family: Arial, Helvetica, sans-serif;
			color: #132C14;
			background: #F5FAF5;
			box-shadow: 0 2px 6px 0 rgba(0,0,0,0.25);
			max-width: 90%;
			width: max-content;
			word-break: break-word;
			z-index: 11000;
			border-radius: 6px;
			border: 1px solid #A9D3AB;
			min-width: 100px;
			padding: 10px 15px;
			display: flex;
			align-items: center;
			position: fixed;
			top: 20px;
			left: 50%;
			transform: translate(-50%, 0);
		}
		.wf_customCircle{
			position: relative;
			background-color: #12AA67;
			border-radius: 100%;
			width: 20px;
			height: 20px;
			flex: none;
			margin-right: 7px;
		}
		.wf_customCheckMark{
			box-sizing: unset !important;
			position: absolute;
			transform: rotate(45deg)translate(-50%, -50%);
			left: 6px;
			top: 9px;
			height: 8px;
			width: 3px;
			border-bottom: 2px solid #fff;
			border-right: 2px solid #fff;
		}
		.wf_customClose{
			box-sizing: border-box;
			position: relative;
			width: 18px;
			height: 18px;
		}
		.wf_customClose::after,
		.wf_customClose::before{
			content: '';
			display: block;
			box-sizing: border-box;
			position: absolute;
			width: 12px;
			height: 1.5px;
			background: #616E88;
			transform: rotate(45deg);
			border-radius: 5px;
			top: 8px;
			left: 1px;
		}
		.wf_customClose::after{
			transform: rotate(-45deg);
		}
	</style>
	<div class='wf_customMessageBox' id='wf_splash' style='display:none'>
		<div class='wf_customCircle'>
			<div class='wf_customCheckMark'></div>
		</div>
		<span id='wf_splash_info'></span>
	</div>
	<form id='webform736128000002995001' name='WebToContacts736128000002995001' accept-charset='UTF-8'>
		<input type='text' style='display:none;' name='xnQsjsdp' value='4277526293033e6fe020c2e144293b118c124dcbf5243b614a2d6bebbdd3793a' />
		<input type='hidden' name='zc_gad' id='zc_gad' value='' />
		<input type='text' style='display:none;' name='xmIwtLD' value='3bfcdf77847dab6b944e473096173a9ff0b4bdd80c6aea3de2f5cfa90e3ac3469f5c6d1c5f77413d4edf282d178841a3' />
		<input type='text' style='display:none;' name='actionType' value='Q29udGFjdHM=' />
		<input type='text' style='display:none;' name='returnURL' value='null' />
		<!-- Do not remove this code. -->
		<input type='text' style='display:none;' id='ldeskuid' name='ldeskuid' />
		<input type='text' style='display:none;' id='LDTuvid' name='LDTuvid' />
		<!-- Do not remove this code. -->
		<style>
			html,body{
				margin: 0px;
			}
			.formsubmit.zcwf_button{
				color: white !important;
				background: transparent linear-gradient(0deg, #0279FF 0%, #00A3F3 100%);
			}
			#crmWebToEntityForm.zcwf_lblLeft{
				width: 100%;
				padding: 0px;
				margin: 0 auto;
				box-sizing: border-box;
			}
			#crmWebToEntityForm.zcwf_lblLeft *{
				box-sizing: border-box;
			}
			#crmWebToEntityForm{
				text-align: left;
			}
			#crmWebToEntityForm *{
				direction: ltr;
			}
			.zcwf_lblLeft .zcwf_title{
				word-wrap: break-word;
				padding: 0px 6px 10px;
				font-weight: bold;
				color: #eae9d4;
			}
			.zcwf_lblLeft.cpT_primaryBtn:hover{
				background: linear-gradient(#02acff 0,#006be4 100%)no-repeat padding-box !important;
				box-shadow: 0 -2px 0 0 #0159b9 inset !important;
				border: 0 !important;
				color: #fff !important;
				outline: 0 !important;
			}
			.zcwf_lblLeft .zcwf_col_fld input[type=text], input[type=password], .zcwf_lblLeft .zcwf_col_fld textarea{
				width: 100%;
				border: 1px solid rgba(255,255,255,0.15) !important;
				background: rgba(255,255,255,0.05);
				color: #fff;
				resize: vertical;
				border-radius: 4px;
				float: left;
				padding: 8px 10px;
			}
			.zcwf_lblLeft .zcwf_col_lab{
				width: 100%;
				word-break: break-word;
				padding: 0px 6px 4px;
				margin-top: 10px;
				float: left;
				min-height: 1px;
				color: #c6c5af;
				font-size: 13px;
			}
			.zcwf_lblLeft .zcwf_col_fld{
				float: left;
				width: 100%;
				padding: 0px 6px 0px;
				position: relative;
				margin-top: 0px;
			}
			.zcwf_lblLeft .zcwf_privacy{
				padding: 6px;
			}
			.zcwf_lblLeft .wfrm_fld_dpNn{
				display: none;
			}
			.dIB{
				display: inline-block;
			}
			.zcwf_lblLeft .zcwf_col_fld_slt{
				width: 100%;
				border: 1px solid rgba(255,255,255,0.15);
				background: rgba(255,255,255,0.05);
				color: #fff;
				border-radius: 4px;
				font-size: 13px;
				float: left;
				resize: vertical;
				padding: 8px 5px;
			}
			.zcwf_lblLeft .zcwf_row:after, .zcwf_lblLeft .zcwf_col_fld:after{
				content: '';
				display: table;
				clear: both;
			}
			.zcwf_lblLeft .zcwf_col_help{
				float: left;
				margin-left: 7px;
				font-size: 12px;
				max-width: 90%;
				word-break: break-word;
				color: #9a9a8a;
			}
			.zcwf_lblLeft .zcwf_help_icon{
				cursor: pointer;
				width: 16px;
				height: 16px;
				display: inline-block;
				background: rgba(255,255,255,0.08);
				border: 1px solid rgba(255,255,255,0.2);
				color: #c6c5af;
				text-align: center;
				font-size: 11px;
				line-height: 16px;
				font-weight: bold;
				border-radius: 50%;
			}
			.zcwf_lblLeft .zcwf_row{
				margin: 6px 0px;
			}
			.zcwf_lblLeft .formsubmit{
				margin-right: 5px;
				cursor: pointer;
				color: #313949;
				font-size: 12px;
			}
			.zcwf_lblLeft .zcwf_privacy_txt{
				width: 90%;
				font-size: 12px;
				font-family: Arial;
				display: inline-block;
				vertical-align: top;
				color: #c6c5af;
				padding-top: 2px;
				margin-left: 6px;
			}
			.zcwf_lblLeft .zcwf_button{
				font-size: 13px;
				color: #0b0b0b;
				border: none;
				padding: 10px 20px;
				border-radius: 6px;
				cursor: pointer;
				max-width: 160px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-weight: 700;
			}
			.zcwf_lblLeft .zcwf_tooltip_over{
				position: relative;
			}
			.zcwf_lblLeft .zcwf_tooltip_ctn{
				position: absolute;
				background: #2a2a2a;
				padding: 3px 6px;
				top: 3px;
				border-radius: 4px;
				word-break: break-word;
				min-width: 100px;
				max-width: 220px;
				color: #eae9d4;
				z-index: 100;
			}
			.zcwf_lblLeft .zcwf_ckbox{
				float: left;
			}
			.zcwf_lblLeft .zcwf_file{
				width: 55%;
				box-sizing: border-box;
				float: left;
			}
			.cBoth:after{
				content: '';
				display: block;
				clear: both;
			}
		</style>
		<div class='zcwf_row'>
			<div class='zcwf_col_lab'>
				<label for='First_Name'>First Name<span style='color:#e0806a;'>*</span></label>
			</div>
			<div class='zcwf_col_fld'>
				<input type='text' id='First_Name' aria-required='true' aria-label='First Name' name='First Name' aria-valuemax='40' maxlength='40' />
				<div class='zcwf_col_help'></div>
			</div>
		</div>
		<div class='zcwf_row'>
			<div class='zcwf_col_lab'>
				<label for='Last_Name'>Last Name<span style='color:#e0806a;'>*</span></label>
			</div>
			<div class='zcwf_col_fld'>
				<input type='text' id='Last_Name' aria-required='true' aria-label='Last Name' name='Last Name' aria-valuemax='80' maxlength='80' />
				<div class='zcwf_col_help'></div>
			</div>
		</div>
		<div class='zcwf_row'>
			<div class='zcwf_col_lab'>
				<label for='Email'>Primary Email<span style='color:#e0806a;'>*</span></label>
			</div>
			<div class='zcwf_col_fld'>
				<input type='text' ftype='email' autocomplete='false' id='Email' aria-required='true' aria-label='Email' name='Email' aria-valuemax='100' crmlabel='' maxlength='100' />
				<div class='zcwf_col_help'>
					<span title='You will be able to login to the student portal using this email.' style='cursor: pointer; width: 16px; height: 16px; display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #c6c5af; text-align: center; font-size: 11px; line-height: 16px; font-weight: bold; border-radius: 50%;' onclick='tooltipShow736128000002995001(this)'>?</span>
					<div class='zcwf_tooltip_over' style='display: none;'>
						<span class='zcwf_tooltip_ctn'>You will be able to login to the student portal using this email.</span>
					</div>
				</div>
			</div>
		</div>
		<div class='zcwf_row'>
			<div class='zcwf_col_lab'>
				<label for='Mobile'>Mobile<span style='color:#e0806a;'>*</span></label>
			</div>
			<div class='zcwf_col_fld'>
				<input type='text' id='Mobile' aria-required='true' aria-label='Mobile' name='Mobile' aria-valuemax='30' maxlength='30' />
				<div class='zcwf_col_help'></div>
			</div>
		</div>
		<div class='zcwf_row wfrm_fld_dpNn'>
			<div class='zcwf_col_lab'>
				<label for='Lead_Source'>Lead Source</label>
			</div>
			<div class='zcwf_col_fld'>
				<select class='zcwf_col_fld_slt' role='combobox' aria-expanded='false' aria-haspopup='listbox' id='Lead_Source' onChange='addAriaSelected736128000002995001()' aria-required='false' aria-label='Lead Source' name='Lead Source'>
					<option value='-None-'>-None-</option>
					<option value='Facebook'>Facebook</option>
					<option value='Inbound Call'>Inbound Call</option>
					<option value='Inbound Email'>Inbound Email</option>
					<option value='Instagram'>Instagram</option>
					<option value='LinkedIn'>LinkedIn</option>
					<option value='Magazine Downloads'>Magazine Downloads</option>
					<option value='NKC Network Referral'>NKC Network Referral</option>
					<option value='NKC Personal Insta'>NKC Personal Insta</option>
					<option value='Student Referral'>Student Referral</option>
					<option value='Webchat'>Webchat</option>
					<option value='Webform'>Webform</option>
					<option selected value='Webform Booking'>Webform Booking</option>
					<option value='Webinar'>Webinar</option>
					<option value='WhatsApp Enquiry'>WhatsApp Enquiry</option>
				</select>
				<div class='zcwf_col_help'></div>
			</div>
		</div>
		<input type='text' type='hidden' style='display: none;' name='aG9uZXlwb3Q' value=''/>
		<div class='zcwf_row'>
			<div class='zcwf_col_lab'></div>
			<div class='zcwf_col_fld'>
				<input type='submit' id='formsubmit' role='button' class='formsubmit zcwf_button' value='Submit' aria-label='Submit' title='Submit' />
				<input type='reset' class='zcwf_button' role='button' name='reset' value='Reset' aria-label='Reset' title='Reset' style='margin-left: 8px; background: rgba(255,255,255,0.08); color: #c6c5af !important;' />
			</div>
		</div>
		<script>
			function addAriaSelected736128000002995001(){
				var optionElem = event.target;
				var previousSelectedOption = optionElem.querySelector('[aria-selected=true]');
				if (previousSelectedOption) {
					previousSelectedOption.removeAttribute('aria-selected');
				}
				optionElem.querySelectorAll('option')[optionElem.selectedIndex].ariaSelected = 'true';
			}
			function validateEmail736128000002995001(){
				var form = document.forms['WebToContacts736128000002995001'];
				var emailFld = form.querySelectorAll('[ftype=email]');
				var i;
				for(i = 0; i < emailFld.length; i++ ) {
					var emailVal = emailFld[i].value;
					if ((emailVal.replace (/^\\s+|\\s+$/g,'') ) .length != 0) {
						var atpos = emailVal.indexOf('@');
						var dotpos = emailVal.lastIndexOf('.');
						if(atpos < 1 || dotpos < atpos + 2 || dotpos + 2 >= emailVal.length) {
							alert('Please enter a valid email address. ');
							emailFld[i].focus();
							return false;
						}
					}
				}
				return true;
			}
			function checkMandatory736128000002995001(isAjax){
				var mndFileds = new Array('First Name', 'Last Name', 'Email', 'Mobile');
				var fldLangVal = new Array('First Name', 'Last Name', 'Primary Email', 'Mobile');
				for (i = 0; i < mndFileds.length; i++ ) {
					var fieldObj = document.forms['WebToContacts736128000002995001'][mndFileds[i]];
					if (fieldObj) {
						if(((fieldObj.value).replace (/^\\s+|\\s+$/g,'')).length == 0) {
							if (fieldObj.type == 'file') {
								alert('Please select a file to upload.');
								fieldObj.focus();
								return false;
							}
							alert(fldLangVal[i] + ' cannot be empty.');
							fieldObj.focus();
							return false;
						} else if (fieldObj.nodeName == 'SELECT') {
							if (fieldObj.options[fieldObj.selectedIndex].value == '-None-') {
								alert(fldLangVal[i] + ' cannot be none.');
								fieldObj.focus();
								return false;
							}
						} else if (fieldObj.type == 'checkbox') {
							if (fieldObj.checked == false) {
								alert('Please accept ' + fldLangVal[i]);
								fieldObj.focus();
								return false;
							}
						}
						try{
							if (fieldObj.name == 'Last Name') {
								name = fieldObj.value;
							}
						} catch (e){}
					}
				}
				trackVisitor736128000002995001();
				if ( !validateEmail736128000002995001 () ) {
					return false;
				}
				var urlparams = new URLSearchParams(window.location.search);
				if (urlparams.has('service') && (urlparams.get('service') === 'smarturl') ) {
					var webform = document.getElementById('webform736128000002995001');
					var service = urlparams.get('service');
					var smarturlfield = document.createElement('input');
					smarturlfield.setAttribute('type', 'hidden');
					smarturlfield.setAttribute('value', service);
					smarturlfield.setAttribute('name', 'service');
					webform.appendChild(smarturlfield);
				}
				document.querySelector('.crmWebToEntityForm .formsubmit').setAttribute('disabled', true);
			}
			function captchaFailedHandling736128000002995001(message){
				var capErr = document.getElementById('captchaErr736128000002995001');
				capErr.innerHTML = message;
				capErr.style.visibility = 'visible';
				var capFld = document.getElementById('captchaField736128000002995001');
				capFld.focus();
				setTimeout(function(){
					capErr.style.visibility = 'hidden';
				},
				5000);
			}
			document.getElementById('webform736128000002995001').addEventListener('submit', function(e){
				var ismandatory = checkMandatory736128000002995001(true);
				e.preventDefault();
				if(ismandatory === undefined || ismandatory) {
					if(typeof _wfa_track !== 'undefined' && _wfa_track.wfa_submit) {
						_wfa_track.wfa_submit(e);
					}
					var formData = new FormData(this);
					fetch('https://crm.zoho.in/crm/WebToContactForm', {
						method: 'POST',
						body: formData,
						cache: 'no-cache'
					}).then(response => {
						const contentType = response.headers.get('Content-Type');
						return contentType.includes('application/json') ? response.json(): response.text();
					}).then(data => {
						if(typeof data === 'object') {
							if(data.actionsubmit === 'Splash Message') {
								if(data.invalidCaptcha && data.invalidCaptcha == 'true') {
									captchaFailedHandling736128000002995001(data.actionvalue);
								} else {
									if (typeof reloadImg736128000002995001 !== 'undefined') {
										reloadImg736128000002995001();
									}
									var splashinfodom = document.getElementById('wf_splash_info');
									splashinfodom.innerText = data.actionvalue;
									var splashdom = document.getElementById('wf_splash');
									if(splashinfodom) {
										document.getElementById('webform736128000002995001').reset.click();
										splashdom.style.display = '';
										setTimeout(function(){
											splashdom.style.display = 'none';
										},
										5000);
									}
									if(typeof _wfa_track != 'undefined' && _wfa_track.wfa_post_submit) {
										_wfa_track.wfa_post_submit(e);
									}
								}
							} else if(data.actionsubmit === 'redirect_url' || data.actionsubmit === 'parent_redirect') {
								if(data.success) {
									if(typeof _wfa_track !== 'undefined' && _wfa_track.wfa_post_submit) {
										_wfa_track.wfa_post_submit(e);
									}
									if (typeof historyBack736128000002995001 !== 'undefined') {
										window.addEventListener('focus', historyBack736128000002995001);
									}
								}
								if(data.actionsubmit === 'redirect_url') {
									window.location.assign(data.redirectUrl);
								} else if(data.actionsubmit === 'parent_redirect') {
									parent.window.location = data.redirectUrl;
								}
							} else if(data.actionsubmit === 'parent_redirect') {
								parent.window.location = data.redirectUrl;
							} else if(data.actionsubmit === 'add_hash') {
								document.location.hash = data.hash;
							} else if(data.actionsubmit === 'error_msg') {
								alert(data.message);
							} else if(data.invalidCaptcha && data.invalidCaptcha === 'true') {
								captchaFailedHandling736128000002995001(data.actionvalue);
								if(data.extraAction === 'parent_signal') {
									window.parent.postMessage('checkCaptchaError', '*');
								}
							} else if(data.actionsubmit === 'captcha_error') {
								alert(data.message);
								if(data.extraAction === 'parent_signal') {
									window.parent.postMessage('checkCaptchaError', '*');
								}
							} else if(data.actionsubmit === 'thankyou_page') {
								if(typeof _wfa_track !== 'undefined' && _wfa_track.wfa_post_submit) {
									_wfa_track.wfa_post_submit(e);
									if (typeof historyBack736128000002995001 !== 'undefined') {
										window.addEventListener('focus', historyBack736128000002995001);
									}
								}
								window.location.assign(data.redirectUrl);
							}
						} else {
							document.write(data);
						}
						let formDom = document.querySelector('.crmWebToEntityForm .formsubmit');
						if (formDom) {
							formDom.removeAttribute('disabled');
						}
					}).catch (error => {
						alert('an error occurred');
					});
				}
			});
			if (typeof _wfa_fstprtcken == 'undefined') {
				_wfa_fstprtcken = {};
			}
			_wfa_fstprtcken[736128000002995001] = true;
			function tooltipShow736128000002995001(el){
				var tooltip = el.nextElementSibling;
				var tooltipDisplay = tooltip.style.display;
				if (tooltipDisplay == 'none') {
					var allTooltip = document.getElementsByClassName('zcwf_tooltip_over');
					for (i = 0; i < allTooltip.length; i++ ) {
						allTooltip[i].style.display = 'none';
					}
					tooltip.style.display = 'block';
				} else {
					tooltip.style.display = 'none';
				}
			}
		</script>
		<script type='text/javascript' id='VisitorTracking'>
			var $zoho = $zoho || {};
			$zoho.salesiq = $zoho.salesiq || {
				widgetcode: 'siqc08ba46cfbc1f55a60348a1fa7a43c8c13ee00806f8a303d6411d3b3493cae77',
				values: {},
				ready: function(){}
			};
			var d = document;
			s = d.createElement('script');
			s.type = 'text/javascript';
			s.id = 'zsiqscript';
			s.defer = true;
			s.src = 'https://salesiq.zoho.in/widget';
			t = d.getElementsByTagName('script')[0];
			t.parentNode.insertBefore(s, t);
			function trackVisitor736128000002995001(){
				try{
					if ($zoho) {
						var LDTuvidObj = document.forms['WebToContacts736128000002995001']['LDTuvid'];
						if (LDTuvidObj) {
							LDTuvidObj.value = $zoho.salesiq.visitor.uniqueid();
						}
						var firstnameObj = document.forms['WebToContacts736128000002995001']['First Name'];
						if (firstnameObj) {
							name = firstnameObj.value + ' ' + name;
						}
						$zoho.salesiq.visitor.name(name);
						var emailObj = document.forms['WebToContacts736128000002995001']['Email'];
						if (emailObj) {
							email = emailObj.value;
							$zoho.salesiq.visitor.email(email);
						}
					}
				} catch (e){}
			}
		</script>
		<!-- Do not remove this --- Analytics Tracking code starts -->
		<script id='wf_anal' src='https://crm.zohopublic.in/crm/WebFormAnalyticsServeServlet?rid=4856ea91c459608300bddc7b37ce189e4c04f65f584b779c26b789ea62f8b04c08512bc9c345ca4d10aa364ab5ae2e65gid2439c26c4df9f3b079e65243820fe65a15336640a139b692aefce7aa8cb6afdcgid62714f9bed529307db22a9f67cb4c8419c571abfdaa983fa76e26ac70681d42bgid7595c2aee0db14d22b9de50fa4606fe8b6cc1c5c8145e6991a058073ba24348f&tw=d15d3a553da344b8448f2dc485ab60839e78f1a9faab97b944d206b1768ca933&version=v2'></script>
		<!-- Do not remove this --- Analytics Tracking code ends. -->
	</form>
</div>
`;

/**
 * Renders the client's Zoho Web-to-Contact embed untouched (see comment on
 * ZOHO_FORM_HTML above). `dangerouslySetInnerHTML` never executes injected
 * `<script>` tags, so each one is recreated as a real DOM node and
 * re-appended in place — the standard workaround for running third-party
 * embed scripts inside React — which lets the pasted form's own submit
 * listener (the one that posts to Zoho) attach exactly as it would on a
 * plain HTML page.
 *
 * `onSubmitAttempt` is wired as a *separate* listener on the same form
 * (added after the pasted script's own listener), firing our own
 * `/api/quickJoin` call in parallel with — not instead of, and without
 * altering — the pasted form's own Zoho submission.
 */
export default function ZohoQuickJoinForm({ onSubmitAttempt }: { onSubmitAttempt: (fields: { name: string; email: string; phone: string }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Zoho's own hosted scripts (SalesIQ widget, Web Form Analytics) throw an
    // uncaught "Cannot read properties of undefined (reading 'target')" on
    // submit in this embedded context — confirmed via the browser stack
    // trace that it originates entirely inside their minified bundles
    // (static.zohocdn.com / crm.zohopublic.in), not this component. It
    // doesn't actually break anything (our own /api/quickJoin call below
    // still fires and succeeds independently), but Next's dev-mode overlay
    // treats any uncaught window error as fatal and blocks the UI with a
    // full-screen error. Since we were told not to modify Zoho's own JS,
    // this suppresses only errors whose source file is one of their known
    // script URLs — anything else still surfaces normally.
    const suppressZohoScriptErrors = (event: ErrorEvent) => {
      const src = event.filename || "";
      if (src.includes("zohocdn.com") || src.includes("zohopublic.in") || src.includes("salesiq.zoho")) {
        console.warn("[ZohoQuickJoinForm] suppressed a Zoho-side script error (does not affect quickJoin):", event.message, src);
        event.preventDefault();
      }
    };
    window.addEventListener("error", suppressZohoScriptErrors);

    const scripts = Array.from(container.querySelectorAll("script"));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.text = oldScript.textContent || "";
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    const form = document.getElementById("webform736128000002995001") as HTMLFormElement | null;
    if (!form) {
      return () => window.removeEventListener("error", suppressZohoScriptErrors);
    }

    const handleSubmit = () => {
      const getVal = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() || "";
      const firstName = getVal("First Name");
      const lastName = getVal("Last Name");
      const email = getVal("Email");
      const phone = getVal("Mobile");
      if (!firstName || !lastName || !email || !phone) return; // the pasted script's own alert() already covers this
      onSubmitAttempt({ name: `${firstName} ${lastName}`.trim(), email, phone });
    };

    form.addEventListener("submit", handleSubmit);
    return () => {
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener("error", suppressZohoScriptErrors);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: ZOHO_FORM_HTML }} />;
}
