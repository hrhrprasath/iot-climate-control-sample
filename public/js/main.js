$(document).foundation();

function show(clickId)
{
	var showdiv = document.getElementById(clickId);
	var tabUl = document.querySelector('.tabs');
	var tabs = tabUl.querySelectorAll('.tab-title');
	var tabcontentdivs = document.querySelector('.tabs-content');
	var tabcontentpanels = tabcontentdivs.querySelectorAll('.content');

	for (var j=0;j<tabcontentpanels.length;j++)
	{
		if (tabcontentpanels[j].id == clickId)
		{
		    tabcontentpanels[j].className=tabcontentpanels[j].className + ' active';
			tabs[j].className=tabs[j].className + ' active';
		} else {
			tabcontentpanels[j].className=tabcontentpanels[j].className.replace('active',"");
			tabs[j].className=tabs[j].className.replace('active','');
		}
	}
}

function setChildCheckboxes(parent, nameItems)
{
  var checkboxes = document.getElementsByName(nameItems);
		console.log("parent.checked = " , parent.checked);
		console.log("parent.name = " , parent.name);

  	for (var i=0, n=checkboxes.length;i<n;i++)
		{
			checkboxes[i].checked = parent.checked;
			console.log("checkboxes[i].checked = " ,checkboxes[i].checked, "i=", i);
		}

}
